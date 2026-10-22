/**
 * Image audit — Parfums De Foda
 *
 * Read-only. Scans every image referenced by data/products.json and reports
 * what the catalogue actually contains: format, dimensions, weight, real
 * transparency, background class and how much of the frame the bottle fills.
 *
 * Usage: npm run audit:images
 * Output: .audit/images.json + a readable summary on stdout.
 *
 * Classification drives the derived pipeline (scripts/build-images.mjs):
 *   transparent  → trim + pad on a transparent canvas, blend normal
 *   pure-white   → trim + pad, blend multiply (white vanishes into the stage)
 *   off-white    → same as pure-white, but the trim tolerance is wider
 *   coloured     → NEVER auto-cut; listed for a manual retouch
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { analyse } from "./lib/image-analysis.mjs";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const OUT_DIR = path.join(ROOT, ".audit");
const OUT_PATH = path.join(OUT_DIR, "images.json");

async function inspect(absPath) {
  const [stat, meta] = await Promise.all([fs.stat(absPath), sharp(absPath).metadata()]);
  const { data, width, height, background, bgColour, box } = await analyse(absPath);
  const hasAlpha = Boolean(meta.hasAlpha) || (meta.channels ?? 0) === 4;

  return {
    format: meta.format ?? path.extname(absPath).slice(1).toLowerCase(),
    width,
    height,
    bytes: stat.size,
    hasAlpha,
    transparentPixels: box?.transparentPixels ?? 0,
    background,
    sampleColour:
      bgColour === null
        ? null
        : `#${bgColour
            .map((c) => Math.round(c).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase()}`,
    square: width === height,
    subject:
      box === null
        ? null
        : {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            widthPct: Math.round((box.width / width) * 1000) / 10,
            heightPct: Math.round((box.height / height) * 1000) / 10,
            areaPct: Math.round(((box.width * box.height) / (width * height)) * 1000) / 10,
          },
  };
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const products = JSON.parse(await fs.readFile(PRODUCTS_PATH, "utf8"));
  const referenced = new Map();
  for (const product of products) {
    const all = [product.image, ...(product.gallery ?? [])].filter(Boolean);
    for (const src of new Set(all)) {
      if (!referenced.has(src)) referenced.set(src, []);
      referenced.get(src).push(product.slug ?? product.id);
    }
  }

  const images = [];
  const missingFiles = [];
  let totalBytes = 0;

  for (const [src, slugs] of referenced) {
    const absPath = path.join(ROOT, "public", src.replace(/^\//, ""));
    let exists = true;
    try {
      await fs.access(absPath);
    } catch {
      exists = false;
    }
    if (!exists) {
      missingFiles.push({ src, products: slugs });
      images.push({ path: src, products: slugs, error: "missing-file" });
      continue;
    }

    const info = await inspect(absPath);
    totalBytes += info.bytes;
    images.push({ path: src, products: slugs, ...info });
  }

  const diskFiles = await fs.readdir(path.join(ROOT, "public", "products"));
  const imageExt = /\.(png|jpe?g|webp|avif)$/i;
  const unreferenced = diskFiles
    .filter((f) => imageExt.test(f) && f !== "placeholder-unavailable.webp")
    .map((f) => `/products/${f}`)
    .filter((p) => !referenced.has(p));

  const byClass = { transparent: 0, "pure-white": 0, "off-white": 0, coloured: 0 };
  for (const img of images) {
    if (img.background) byClass[img.background] += 1;
  }

  const productsWithIssues = {
    missingFiles,
    noImage: products.filter((p) => !p.image).map((p) => p.slug ?? p.id),
    multiImage: products
      .filter((p) => (p.gallery?.length ?? 0) > 1)
      .map((p) => p.slug ?? p.id),
  };

  const heaviest = [...images]
    .filter((i) => typeof i.bytes === "number")
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10)
    .map((i) => ({ path: i.path, bytes: i.bytes }));

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      products: products.length,
      referencedImages: referenced.size,
      onDiskImages: images.filter((i) => !i.error).length,
      totalBytes,
      totalMb: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
      byClass,
      squareCount: images.filter((i) => i.square).length,
      nonSquareCount: images.filter((i) => i.square === false).length,
      withRealTransparency: images.filter((i) => i.transparentPixels > 0).length,
      needsRetouch: images.filter((i) => i.background === "coloured").length,
    },
    problems: { ...productsWithIssues, unreferenced },
    heaviest,
    images: images.sort((a, b) => a.path.localeCompare(b.path)),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // ─── Readable summary ───
  const t = report.totals;
  console.log("\n═══ IMAGE AUDIT ═══");
  console.log(`products             ${t.products}`);
  console.log(`referenced images    ${t.referencedImages}`);
  console.log(`total weight         ${mb(t.totalBytes)}`);
  console.log(
    `backgrounds          transparent ${t.byClass.transparent} · pure-white ${t.byClass["pure-white"]} · off-white ${t.byClass["off-white"]} · coloured ${t.byClass.coloured}`,
  );
  console.log(
    `frames               square ${t.squareCount} · non-square ${t.nonSquareCount} · real transparency ${t.withRealTransparency}`,
  );
  console.log(`missing files        ${missingFiles.length}`);
  console.log(`no image             ${productsWithIssues.noImage.length}`);
  console.log(`multiple images      ${productsWithIssues.multiImage.length}`);
  console.log(`unreferenced on disk ${unreferenced.length}`);

  const nonSquare = images.filter((i) => i.square === false);
  if (nonSquare.length) {
    console.log("\nNon-square:");
    for (const i of nonSquare) console.log(`  ${i.path}  ${i.width}x${i.height}`);
  }

  console.log("\nHeaviest:");
  for (const h of heaviest) console.log(`  ${mb(h.bytes).padStart(9)}  ${h.path}`);

  console.log("\nSubject share (height % of frame):");
  for (const i of images.filter((x) => x.subject)) {
    console.log(
      `  ${String(i.subject.heightPct).padStart(5)}%  ${String(i.subject.widthPct).padStart(5)}%  ${i.background.padEnd(11)} ${i.path}`,
    );
  }

  if (unreferenced.length) {
    console.log("\nUnreferenced on disk (kept, not rendered):");
    for (const p of unreferenced) console.log(`  ${p}`);
  }

  console.log(`\nWrote ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
