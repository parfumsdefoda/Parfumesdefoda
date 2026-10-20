/**
 * Generate public/og-image.png — the 1200x630 social preview card.
 *
 * Social platforms do not render SVG Open Graph images, so the brand logo is
 * rasterized onto a PNG card once and committed. Re-run after changing the
 * logo: `node scripts/generate-og-image.mjs`.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = 520;

const logo = await readFile("public/logos/logo.svg");
const logoPng = await sharp(logo, { density: 900 })
  .resize({ width: LOGO_WIDTH })
  .png()
  .toBuffer();

const logoMeta = await sharp(logoPng).metadata();
const logoHeight = logoMeta.height ?? LOGO_WIDTH;

const background = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F4EEF8"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="28" y="28" width="${WIDTH - 56}" height="${HEIGHT - 56}" rx="18"
        fill="none" stroke="#D4AF37" stroke-width="2" opacity="0.45"/>
</svg>`;

const composed = await sharp(Buffer.from(background))
  .composite([
    {
      input: logoPng,
      top: Math.round((HEIGHT - logoHeight) / 2),
      left: Math.round((WIDTH - LOGO_WIDTH) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile("public/og-image.png", composed);

const { size } = await import("node:fs/promises").then((fs) =>
  fs.stat("public/og-image.png"),
);
console.log(
  `✅ public/og-image.png — ${WIDTH}x${HEIGHT}, ${(Number(size) / 1024).toFixed(1)} KB`,
);
