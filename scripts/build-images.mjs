/**
 * Derived image pipeline — Parfums De Foda
 *
 * Originals in public/products/ are NEVER modified. For every product image
 * this writes a normalised family of derivatives into
 * public/products/derived/{slug}/ and records what exists in
 * src/data/image-manifest.json.
 *
 * Normalisation makes the catalogue look like one shoot:
 *   1. trim the empty border (transparent or white) with a tolerance
 *   2. pad onto a square canvas so the subject is the SAME share of the frame
 *      (72% of the longest side), centred, with a 2% upward optical shift
 *   3. keep a transparent background — the UI multiplies away white residues
 *
 * Usage: npm run build:images [--force] [--slug=pf020]
 * Idempotent: skips products whose outputs are newer than the source.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { analyse } from "./lib/image-analysis.mjs";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const DERIVED_ROOT = path.join(ROOT, "public", "products", "derived");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "image-manifest.json");
const RETOUCH_PATH = path.join(ROOT, ".audit", "needs-retouch.txt");

/** Subject occupies this share of the canvas' longest side. */
const SUBJECT_SHARE = 0.72;
/** Optical centring: nudge the subject up so the optical mass sits centred. */
const OPTICAL_SHIFT = 0.02;

const OUTPUTS = [
  { name: "card-400", w: 400, format: "avif", quality: 60 },
  { name: "card-400", w: 400, format: "webp", quality: 80 },
  { name: "card-800", w: 800, format: "avif", quality: 60 },
  { name: "card-800", w: 800, format: "webp", quality: 80 },
  { name: "pdp-1200", w: 1200, format: "avif", quality: 60 },
  { name: "pdp-1200", w: 1200, format: "webp", quality: 80 },
  { name: "pdp-2000", w: 2000, format: "webp", quality: 80 },
];

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isUpToDate(src, dir) {
  const srcStat = await fs.stat(src);
  for (const out of OUTPUTS) {
    const file = path.join(dir, `${out.name}.${out.format}`);
    if (!(await exists(file))) return false;
    const stat = await fs.stat(file);
    if (stat.mtimeMs < srcStat.mtimeMs) return false;
  }
  return true;
}

/**
 * Trim → pad → square. Returns a PNG buffer of the normalised canvas plus the
 * canvas size, or null when the subject could not be isolated.
 */
async function normalise(absSrc) {
  const info = await analyse(absSrc);
  if (!info.box) return null;

  const { data, width, height, box } = info;
  const canvas = Math.round(Math.max(box.width, box.height) / SUBJECT_SHARE);
  const left = Math.round((canvas - box.width) / 2);
  const rawTop = Math.round((canvas - box.height) / 2 - canvas * OPTICAL_SHIFT);
  const top = Math.max(0, Math.min(rawTop, canvas - box.height));

  const buffer = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .extend({
      top,
      bottom: canvas - box.height - top,
      left,
      right: canvas - box.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return { buffer, canvas, background: info.background, box };
}

async function buildProduct(product, { force }) {
  const src = product.image;
  const absSrc = path.join(ROOT, "public", src.replace(/^\//, ""));

  if (!(await exists(absSrc))) {
    return { slug: product.slug, status: "missing-source", src };
  }

  const slug = product.slug;
  const dir = path.join(DERIVED_ROOT, slug);
  const relDir = `/products/derived/${slug}`;

  const info = await analyse(absSrc);
  // A coloured/other background is never auto-cut — the owner retouches it.
  if (info.background === "coloured") {
    return {
      slug,
      status: "needs-retouch",
      src,
      background: info.background,
    };
  }

  if (!force && (await isUpToDate(absSrc, dir))) {
    const files = await Promise.all(
      OUTPUTS.map(async (out) => {
        const stat = await fs.stat(path.join(dir, `${out.name}.${out.format}`));
        return { ...out, bytes: stat.size };
      }),
    );
    return {
      slug,
      status: "cached",
      src,
      dir: relDir,
      background: info.background,
      files,
      // Same values a fresh build would produce, so a cached run rewrites the
      // manifest with identical content instead of nulling the canvas out.
      canvas: info.box
        ? Math.round(Math.max(info.box.width, info.box.height) / SUBJECT_SHARE)
        : null,
      sourceBytes: (await fs.stat(absSrc)).size,
    };
  }

  const normalised = await normalise(absSrc);
  if (!normalised) return { slug, status: "empty-frame", src };

  await fs.mkdir(dir, { recursive: true });
  const files = [];

  for (const out of OUTPUTS) {
    const file = path.join(dir, `${out.name}.${out.format}`);
    let image = sharp(normalised.buffer).resize(out.w, out.w, { fit: "fill" });
    image =
      out.format === "avif"
        ? image.avif({ quality: out.quality, effort: 4 })
        : image.webp({ quality: out.quality, effort: 5 });
    await image.toFile(file);
    files.push({ ...out, bytes: (await fs.stat(file)).size });
  }

  return {
    slug,
    status: "built",
    src,
    dir: relDir,
    background: normalised.background,
    canvas: normalised.canvas,
    files,
    sourceBytes: (await fs.stat(absSrc)).size,
  };
}

function manifestEntry(result) {
  const byWidth = new Map();
  for (const file of result.files) {
    if (!byWidth.has(file.w)) byWidth.set(file.w, { w: file.w });
    byWidth.get(file.w)[file.format] = `${result.dir}/${file.name}.${file.format}`;
  }
  return {
    source: result.src,
    background: result.background,
    // White sources keep a white residue inside the bottle cut-out; multiply
    // makes it disappear into the stage instead of showing a grey box.
    blend: result.background === "transparent" ? "normal" : "multiply",
    canvas: result.canvas,
    files: [...byWidth.values()].sort((a, b) => a.w - b.w),
  };
}

async function main() {
  const force = process.argv.includes("--force");
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const onlySlug = slugArg ? slugArg.split("=")[1] : null;

  const products = JSON.parse(await fs.readFile(PRODUCTS_PATH, "utf8"));
  const queue = onlySlug ? products.filter((p) => p.slug === onlySlug) : products;
  if (queue.length === 0) {
    console.error(`No product matches ${onlySlug}`);
    process.exit(1);
  }

  // Reuse the previous manifest so a partial run never drops entries.
  let previous = { products: {} };
  if (await exists(MANIFEST_PATH)) {
    try {
      previous = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
    } catch {
      previous = { products: {} };
    }
  }

  const results = [];
  for (const product of queue) {
    const result = await buildProduct(product, { force });
    results.push(result);
    const label = String(product.slug).padEnd(8);
    if (result.status === "needs-retouch") {
      console.log(`  ⚠ ${label} needs a manual retouch (${result.background} background) — original kept`);
    } else if (result.status === "missing-source") {
      console.log(`  ✖ ${label} source missing: ${result.src}`);
    } else if (result.status === "empty-frame") {
      console.log(`  ✖ ${label} no subject found in the frame`);
    } else {
      const total = result.files.reduce((sum, f) => sum + f.bytes, 0);
      console.log(
        `  ${result.status === "cached" ? "·" : "✓"} ${label} ${result.files.length} files, ${kb(total)}${
          result.sourceBytes ? ` (source ${kb(result.sourceBytes)})` : ""
        }`,
      );
    }
  }

  const productsManifest = { ...previous.products };
  for (const result of results) {
    if (result.status === "built" || result.status === "cached") {
      productsManifest[result.slug] = manifestEntry(result);
    } else {
      // Never fall through to a stale derived entry for a skipped product.
      delete productsManifest[result.slug];
    }
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    normalisation: {
      subjectShare: SUBJECT_SHARE,
      opticalShift: OPTICAL_SHIFT,
    },
    products: Object.fromEntries(
      Object.entries(productsManifest).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };

  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const retouch = results
    .filter((r) => r.status === "needs-retouch")
    .map((r) => `${r.slug}\t${r.src}\t${r.background} background — cut it out manually, then re-run build:images`);
  await fs.mkdir(path.dirname(RETOUCH_PATH), { recursive: true });
  await fs.writeFile(
    RETOUCH_PATH,
    [
      "# Products whose photo cannot be normalised automatically.",
      "# Give each one a transparent PNG/WebP cut-out at the same file path,",
      "# then run: npm run build:images -- --slug=<slug> --force",
      ...retouch,
      "",
    ].join("\n"),
    "utf8",
  );

  // ─── Before / after ───
  const built = results.filter((r) => r.files?.length);
  const sourceTotal = built.reduce((sum, r) => sum + (r.sourceBytes ?? 0), 0);
  const derivedTotal = built.reduce((sum, r) => sum + r.files.reduce((s, f) => s + f.bytes, 0), 0);
  const skipped = results.filter((r) => r.status === "needs-retouch");

  console.log("\n═══ DERIVED IMAGES ═══");
  console.log(`built ${results.filter((r) => r.status === "built").length} · cached ${results.filter((r) => r.status === "cached").length} · skipped ${skipped.length}`);
  if (built.length) {
    console.log(`originals (this run)   ${kb(sourceTotal)}`);
    console.log(`all derivatives        ${kb(derivedTotal)}`);
    console.log(
      `card-400 avif+webp     ${kb(
        built.reduce(
          (s, r) => s + r.files.filter((f) => f.name === "card-400").reduce((a, f) => a + f.bytes, 0),
          0,
        ),
      )} for ${built.length} products`,
    );
  }
  if (skipped.length) {
    console.log(`\nNeeds retouch (originals kept): ${skipped.map((s) => s.slug).join(", ")}`);
  }
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
