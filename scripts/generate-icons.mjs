/**
 * Generate the favicon-family PNGs from the EXISTING logo.
 *
 *   node scripts/generate-icons.mjs
 *
 * Writes public/apple-touch-icon.png (180x180) and public/icon-512.png
 * (512x512) by rasterizing public/logos/logo.svg onto the brand background
 * colour from data/theme.json. The logo is never redrawn; re-run this after a
 * logo change and commit the result.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const theme = JSON.parse(await readFile("data/theme.json", "utf8"));
const background = theme.colors?.primary || "#ffffff";
const logo = await readFile("public/logos/logo.svg");

async function renderIcon(size) {
  const box = Math.round(size * 0.78);
  const logoPng = await sharp(logo, { density: 900 })
    .resize({ width: box, height: box, fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(logoPng).metadata();
  const width = meta.width ?? box;
  const height = meta.height ?? box;

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: logoPng,
        top: Math.round((size - height) / 2),
        left: Math.round((size - width) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

for (const [file, size] of [
  ["public/apple-touch-icon.png", 180],
  ["public/icon-512.png", 512],
]) {
  const png = await renderIcon(size);
  await writeFile(file, png);
  console.log(`✅ ${file} — ${size}x${size}, ${(png.length / 1024).toFixed(1)} KB`);
}
