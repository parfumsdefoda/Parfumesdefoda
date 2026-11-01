/**
 * The photo gate the importer consults before touching a master row.
 *
 * Three rules, all of them learned the hard way:
 *   1. The name is matched EXACTLY. This repo is edited on Windows and built on
 *      Linux, so `pf760.png` opens locally and 404s on every deployment.
 *   2. The file must be a readable PNG (the size comes from the IHDR header, so
 *      nothing is decoded and no dependency is added).
 *   3. The short side must be at least MIN_SHORT_SIDE px: a 120px thumbnail
 *      blown up to a 4:5 card is worse than no photo at all.
 *
 * A row that fails the gate is skipped entirely (see `MasterPhotoGate` in
 * src/lib/product-master.ts) — it is never half-applied.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const PHOTO_DIR = "public/products";
export const MIN_SHORT_SIDE = 400;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** `{ width, height }` of a PNG, or null when the file is not a readable PNG. */
export function pngSize(filePath) {
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    return null;
  }
  if (buffer.length < 24) return null;
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (buffer[index] !== PNG_SIGNATURE[index]) return null;
  }
  if (buffer.toString("latin1", 12, 16) !== "IHDR") return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

/**
 * Build the gate for one checkout.
 *
 * The directory is read once: on Windows `existsSync("PF760.png")` also answers
 * true for a file called `pf760.png`, which is exactly the bug this prevents.
 */
export function createPhotoGate(root = process.cwd()) {
  const dir = path.join(root, PHOTO_DIR);
  let names = new Set();
  try {
    names = new Set(readdirSync(dir));
  } catch {
    names = new Set();
  }

  const byLower = new Map();
  for (const name of names) {
    if (!byLower.has(name.toLowerCase())) byLower.set(name.toLowerCase(), name);
  }

  /** Dimensions cached per file — a refresh reads each photo once. */
  const sizes = new Map();
  const sizeOf = (fileName) => {
    if (!sizes.has(fileName)) sizes.set(fileName, pngSize(path.join(dir, fileName)));
    return sizes.get(fileName);
  };

  return {
    /** Every file name actually present (case-sensitive). */
    names,
    exists: (fileName) => names.has(fileName),
    caseVariant: (fileName) => {
      const variant = byLower.get(fileName.toLowerCase());
      return variant && variant !== fileName ? variant : null;
    },
    shortSide: (fileName) => {
      const size = sizeOf(fileName);
      return size ? Math.min(size.width, size.height) : null;
    },
    minShortSide: MIN_SHORT_SIDE,
    /** The same exact-name rule, phrased for an image path like /products/X.png. */
    imageExists: (imagePath) => {
      const fileName = String(imagePath ?? "").split("?")[0].split("/").pop() ?? "";
      return fileName !== "" && names.has(fileName);
    },
  };
}
