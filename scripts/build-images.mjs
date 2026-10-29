/**
 * Derived image pipeline — Parfums De Foda
 *
 * Originals in public/products/ are NEVER modified. For every product image —
 * the cover and each extra gallery view — this writes a normalised family of
 * derivatives into public/products/derived/{slug}/ and records what exists in
 * src/data/image-manifest.json. The key is the file name
 * (`/products/PF091.png` → `pf091`), so a gallery view resolves the same way
 * as a cover.
 *
 * Normalisation makes the catalogue look like one shoot:
 *   1. trim the empty border (transparent or white) with a tolerance
 *   2. pad onto a square canvas so the subject is the SAME share of the frame
 *      (72% of the longest side), centred, with a 2% upward optical shift
 *   3. keep a transparent background — the UI multiplies away white residues
 *
 * A photo with a coloured (or otherwise unusable) background is NEVER cut: it
 * is written as a "framed" family — the original pixels, resized and encoded,
 * aspect ratio untouched — so the page still gets a light file while the owner
 * prepares a proper cut-out. The manifest marks those entries `mode: "framed"`.
 *
 * Usage: npm run build:images [--force] [--slug=pf020]
 * Idempotent: skips products whose outputs are newer than the source.
 */

import crypto from "node:crypto";
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

/** Widths for a `framed` family (no upscaling past the source). */
const FRAMED_WIDTHS = [400, 800, 1200];

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

/** Manifest key for an image path: `/products/PF091.png` → `pf091`. */
function imageSlug(src) {
  return path.basename(src, path.extname(src)).toLowerCase();
}

/** Content hash of an original — mtimes lie after a git checkout. */
async function sourceHash(src) {
  const buffer = await fs.readFile(src);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Up to date means: the SAME bytes as last time AND every output still present.
 * A replaced photo at the same path (the owner re-shoots a bottle) must rebuild
 * even when the filesystem handed the new file an older mtime.
 */
async function isUpToDate(dir, previousEntry, hash) {
  if (!previousEntry || previousEntry.sourceHash !== hash) return false;
  for (const out of OUTPUTS) {
    if (!(await exists(path.join(dir, `${out.name}.${out.format}`)))) return false;
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

/**
 * Resize-only family for a photo we cannot normalise. Same pixels, same
 * aspect ratio, no trim and no pad — the rectangular photo stays rectangular,
 * exactly as the owner framed it. Never upscales.
 */
async function buildFramed(slug, src, absSrc, info, hash, dir, relDir, { force, previousEntry }) {
  const outputs = [];
  for (const width of FRAMED_WIDTHS) {
    for (const format of ["avif", "webp"]) {
      outputs.push({ name: `framed-${width}`, w: width, format });
    }
  }

  const reusable =
    !force &&
    previousEntry?.sourceHash === hash &&
    previousEntry?.mode === "framed" &&
    (await Promise.all(
      outputs.map((out) => exists(path.join(dir, `${out.name}.${out.format}`))),
    )).every(Boolean);

  if (reusable) {
    const files = await Promise.all(
      outputs.map(async (out) => {
        const stat = await fs.stat(path.join(dir, `${out.name}.${out.format}`));
        return { ...out, bytes: stat.size };
      }),
    );
    return {
      slug,
      status: "cached",
      src,
      dir: relDir,
      mode: "framed",
      background: info.background,
      files,
      sourceHash: hash,
      sourceBytes: (await fs.stat(absSrc)).size,
    };
  }

  await fs.mkdir(dir, { recursive: true });
  const files = [];
  for (const out of outputs) {
    const file = path.join(dir, `${out.name}.${out.format}`);
    let image = sharp(absSrc).resize({
      width: out.w,
      withoutEnlargement: true,
    });
    image =
      out.format === "avif"
        ? image.avif({ quality: 62, effort: 4 })
        : image.webp({ quality: 80, effort: 5 });
    await image.toFile(file);
    const meta = await sharp(file).metadata();
    files.push({
      ...out,
      w: meta.width ?? out.w,
      h: meta.height ?? out.w,
      bytes: (await fs.stat(file)).size,
    });
  }

  return {
    slug,
    status: "built",
    src,
    dir: relDir,
    mode: "framed",
    background: info.background,
    files,
    sourceHash: hash,
    sourceBytes: (await fs.stat(absSrc)).size,
  };
}

async function buildImage(slug, src, { force, previousEntry }) {
  const absSrc = path.join(ROOT, "public", src.replace(/^\//, ""));

  if (!(await exists(absSrc))) {
    return { slug, status: "missing-source", src };
  }

  const dir = path.join(DERIVED_ROOT, slug);
  const relDir = `/products/derived/${slug}`;
  const hash = await sourceHash(absSrc);

  const info = await analyse(absSrc);
  // A coloured/other background is never auto-cut — but it is still served
  // light, as a framed (resize-only) family, until the owner retouches it.
  if (info.background === "coloured") {
    const framed = await buildFramed(slug, src, absSrc, info, hash, dir, relDir, {
      force,
      previousEntry,
    });
    return { ...framed, needsRetouch: true };
  }

  if (!force && (await isUpToDate(dir, previousEntry, hash))) {
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
      sourceHash: hash,
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
    sourceHash: hash,
    sourceBytes: (await fs.stat(absSrc)).size,
  };
}

function manifestEntry(result) {
  const byWidth = new Map();
  for (const file of result.files) {
    if (!byWidth.has(file.w)) byWidth.set(file.w, { w: file.w });
    const bucket = byWidth.get(file.w);
    bucket[file.format] = `${result.dir}/${file.name}.${file.format}`;
    if (file.h) bucket.h = file.h;
  }
  const framed = result.mode === "framed";
  return {
    source: result.src,
    sourceHash: result.sourceHash,
    background: result.background,
    mode: framed ? "framed" : "cutout",
    // White sources keep a white residue inside the bottle cut-out; multiply
    // makes it disappear into the stage instead of showing a grey box. A
    // framed photo is opaque, so it is always drawn as-is.
    blend:
      framed || result.background === "transparent" ? "normal" : "multiply",
    canvas: result.canvas ?? null,
    files: [...byWidth.values()].sort((a, b) => a.w - b.w),
  };
}

async function main() {
  const force = process.argv.includes("--force");
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const onlySlug = slugArg ? slugArg.split("=")[1] : null;

  const products = JSON.parse(await fs.readFile(PRODUCTS_PATH, "utf8"));

  // Every referenced image: the cover first, then each extra gallery view.
  // One file may be referenced twice — derive it once.
  const queue = [];
  const seenImages = new Set();
  for (const product of products) {
    const images = [product.image, ...(product.gallery ?? [])].filter(
      (src) => typeof src === "string" && src.startsWith("/"),
    );
    for (const src of images) {
      const slug = imageSlug(src);
      // The shared placeholder is referenced by several products: derive once.
      if (seenImages.has(slug)) continue;
      seenImages.add(slug);
      queue.push({ slug, src, product: product.slug });
    }
  }

  const filtered = onlySlug
    ? queue.filter((entry) => entry.slug === onlySlug || entry.product === onlySlug)
    : queue;

  if (filtered.length === 0) {
    console.error(`No product or image matches ${onlySlug}`);
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
  for (const entry of filtered) {
    const result = await buildImage(entry.slug, entry.src, {
      force,
      previousEntry: previous.products?.[entry.slug],
    });
    results.push(result);
    const label = String(entry.slug).padEnd(8);
    if (result.status === "missing-source") {
      console.log(`  ✖ ${label} source missing: ${result.src}`);
    } else if (result.status === "empty-frame") {
      console.log(`  ✖ ${label} no subject found in the frame`);
    } else {
      const total = result.files.reduce((sum, f) => sum + f.bytes, 0);
      console.log(
        `  ${result.status === "cached" ? "·" : "✓"} ${label} ${result.files.length} files, ${kb(total)}${
          result.sourceBytes ? ` (source ${kb(result.sourceBytes)})` : ""
        }${result.needsRetouch ? "  ⚠ framed (retouch pending)" : ""}`,
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
    .filter((r) => r.needsRetouch)
    .map(
      (r) =>
        `${r.slug}\t${r.src}\t${r.background} background — served as a framed (uncut) resize for now; give it a transparent cut-out, then run: npm run build:images -- --slug=${r.slug} --force`,
    );
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
  const skipped = results.filter((r) => r.needsRetouch);

  console.log("\n═══ DERIVED IMAGES ═══");
  console.log(`built ${results.filter((r) => r.status === "built").length} · cached ${results.filter((r) => r.status === "cached").length} · framed ${skipped.length}`);
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
    console.log(
      `\nRetouch pending (framed resize served meantime): ${skipped.map((s) => s.slug).join(", ")}`,
    );
  }
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
