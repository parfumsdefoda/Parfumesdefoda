/**
 * Shared image analysis — used by scripts/audit-images.mjs and
 * scripts/build-images.mjs so classification and the subject box can never
 * disagree between the audit and the pipeline.
 */

import sharp from "sharp";

/** Corners + edge midpoints, inset so anti-aliased edges cannot vote. */
export function samplePoints(width, height) {
  const ix = Math.round(width * 0.02);
  const iy = Math.round(height * 0.02);
  const w1 = width - 1 - ix;
  const h1 = height - 1 - iy;
  const cx = Math.round((width - 1) / 2);
  const cy = Math.round((height - 1) / 2);
  return [
    [ix, iy],
    [cx, iy],
    [w1, iy],
    [w1, cy],
    [w1, h1],
    [cx, h1],
    [ix, h1],
    [ix, cy],
  ];
}

export function classifyBackground(samples) {
  const opaque = samples.every((px) => px[3] >= 16);
  if (!opaque) return "transparent";

  const minChannel = (px) => Math.min(px[0], px[1], px[2]);
  const maxChannel = (px) => Math.max(px[0], px[1], px[2]);
  if (samples.every((px) => minChannel(px) >= 250)) return "pure-white";
  if (samples.every((px) => minChannel(px) >= 235 && maxChannel(px) - minChannel(px) <= 12)) {
    return "off-white";
  }
  return "coloured";
}

/**
 * Bounding box of everything that is not background, in source pixels.
 * `bgColour` is the average sampled background (null for transparent frames).
 */
export function subjectBox(data, width, height, bgColour, tolerance) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let transparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4;
      const a = data[i + 3];
      if (a < 250) transparentPixels += 1;

      if (a < 16) continue;
      if (
        bgColour !== null &&
        Math.abs(data[i] - bgColour[0]) <= tolerance &&
        Math.abs(data[i + 1] - bgColour[1]) <= tolerance &&
        Math.abs(data[i + 2] - bgColour[2]) <= tolerance
      ) {
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    transparentPixels,
  };
}

/**
 * Decode an image once and return everything the pipeline needs:
 * normalised RGBA pixels (EXIF rotation applied) plus the subject box.
 */
export async function analyse(absPath) {
  const { data, info } = await sharp(absPath)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const points = samplePoints(info.width, info.height);
  const samples = points.map(([x, y]) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  });

  const background = classifyBackground(samples);
  const bgColour =
    background === "transparent"
      ? null
      : samples.reduce(
          (acc, px) => [acc[0] + px[0] / 8, acc[1] + px[1] / 8, acc[2] + px[2] / 8],
          [0, 0, 0],
        );

  const box = subjectBox(
    data,
    info.width,
    info.height,
    bgColour,
    background === "off-white" ? 10 : 6,
  );

  return {
    data,
    width: info.width,
    height: info.height,
    background,
    bgColour,
    box,
  };
}
