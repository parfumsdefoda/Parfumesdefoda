import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/image-manifest.json"), "utf8"));
const failures = [];
const checked = new Set();
const requiredWidths = [400, 800, 1200, 2000];

for (const product of products) {
  for (const source of [product.image, ...(product.gallery ?? [])]) {
    if (typeof source !== "string" || source.includes("placeholder")) continue;
    const file = path.basename(source).replace(/\.[^.]+$/, "").toLowerCase();
    if (checked.has(file)) continue;
    checked.add(file);
    const entry = manifest.products?.[file];
    if (!entry) {
      failures.push(`${product.slug}: ${file} has no image manifest entry`);
      continue;
    }
    if (!['normal', 'multiply'].includes(entry.blend)) failures.push(`${file}: invalid blend value`);
    for (const width of requiredWidths) {
      const derivative = entry.files?.find((candidate) => candidate.w === width);
      if (!derivative) {
        failures.push(`${file}: missing ${width}px derivative set`);
        continue;
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
}
