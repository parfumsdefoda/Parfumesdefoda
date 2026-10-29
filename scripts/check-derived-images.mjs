import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/image-manifest.json"), "utf8"));
const failures = [];
const checked = new Set();
const requiredWidths = [400, 800, 1200, 2000];
const pending = [];

/** Products whose photo cannot be auto-cut are served from the original. */
const retouchPath = path.join(root, ".audit", "needs-retouch.txt");
const needsRetouch = new Set();
if (fs.existsSync(retouchPath)) {
  for (const line of fs.readFileSync(retouchPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    needsRetouch.add(trimmed.split("\t")[0].trim());
  }
}

for (const product of products) {
  // A hidden product (`on_site=لا`) is never rendered, listed or indexed, so a
  // photo the owner has already deleted is not a served-image failure.
  if (product.hidden === true) continue;
  for (const source of [product.image, ...(product.gallery ?? [])]) {
    if (typeof source !== "string" || source.includes("placeholder")) continue;
    const file = path.basename(source).replace(/\.[^.]+$/, "").toLowerCase();
    if (checked.has(file)) continue;
    checked.add(file);
    const entry = manifest.products?.[file];
    if (!entry) {
      const sourceFile = path.join(root, "public", source.replace(/^\//, ""));
      // A listed retouch keeps its original on disk: that is the documented
      // fallback, not a missing derivative.
      if (needsRetouch.has(file) && fs.existsSync(sourceFile)) {
        if (!pending.includes(file)) pending.push(file);
        continue;
      }
      failures.push(`${product.slug}: ${file} has no image manifest entry`);
      continue;
    }
    if (!['normal', 'multiply'].includes(entry.blend)) failures.push(`${file}: invalid blend value`);
    // A `framed` family is a resize-only copy of a photo awaiting retouch: it
    // keeps the original aspect ratio and never has the 2000px tier. It also
    // NEVER upscales, so a narrow source legitimately stops at its own width —
    // the expected tiers are the ones the source can actually fill.
    const framed = entry.mode === 'framed';
    const widths = entry.files?.map((candidate) => candidate.w) ?? [];
    const expected = framed
      ? [400, 800, 1200].filter((width) => Math.max(0, ...widths) >= width)
      : requiredWidths;
    for (const width of expected) {
      const derivative = entry.files?.find((candidate) => candidate.w === width);
      if (!derivative) {
        failures.push(`${file}: missing ${width}px derivative set`);
        continue;
      }
      if (framed && !(typeof derivative.h === 'number' && derivative.h > 0)) {
        failures.push(`${file}: ${width}px framed set has no height`);
      }
      const formats = width === 2000 ? ["webp"] : ["avif", "webp"];
      for (const format of formats) {
        const asset = derivative[format];
        if (!asset) failures.push(`${file}: ${width}px ${format} missing from manifest`);
        else if (!fs.existsSync(path.join(root, "public", asset.replace(/^\//, "")))) {
          failures.push(`${file}: missing file ${asset}`);
        }
      }
    }
  }
}

if (failures.length) {
  console.error(`Derived image check failed (${failures.length}):\n${failures.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Derived image check passed: ${checked.size} unique catalogue images have all expected derivatives.`);
  const hiddenSkipped = products.filter((product) => product.hidden === true).length;
  if (hiddenSkipped) console.log(`Hidden products skipped (not served): ${hiddenSkipped}`);
  if (pending.length) {
    console.log(`Needs a manual retouch, original served: ${pending.join(", ")}`);
  }
}
