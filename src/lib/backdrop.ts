/**
 * Backdrop analysis for catalogue photos that arrive without alpha.
 *
 * Pure functions only: no `node:fs`, no sharp, no React. A raw RGBA buffer goes
 * in, a decision comes out, so the rules are unit-testable on synthetic images
 * and reusable by the derived-image pipeline.
 *
 * The rule (RUN 3, R3-1): a photo is ELIGIBLE for normalisation only when its
 * 6px border ring is one flat light backdrop — the four sides agree, the
 * backdrop is light (relative luminance ≥ 0.82) and the ring has low variance.
 * Anything else (scene, coloured, vignette, dark, a bright subject touching the
 * edge) is left untouched and shown with the `cover` treatment.
 */

export const RING = 6;
/** Max per-channel difference between two side medians. */
export const SIDE_TOLERANCE = 12;
/** Minimum relative luminance of the backdrop. */
export const MIN_LIGHTNESS = 0.82;
/** Max per-channel standard deviation inside the ring. */
export const MAX_VARIANCE = 10;
/** A gain never exceeds this, so a darker grey is not stretched into mush. */
export const MAX_GAIN = 1.25;

export type BackdropReason =
  | "eligible"
  | "alpha"
  | "gradient"
  | "too-dark"
  | "noisy"
  | "channel";

export interface RgbaImage {
  /** RGBA bytes, row-major, 4 per pixel. */
  data: Uint8Array | number[];
  width: number;
  height: number;
}

export interface SideStats {
  /** Median RGB of this side's ring pixels. */
  median: [number, number, number];
  /** Largest per-channel standard deviation on this side. */
  deviation: number;
}

export interface BackdropAnalysis {
  eligible: boolean;
  reason: BackdropReason;
  /** Median RGB over all four sides — the colour the backdrop "is". */
  median: [number, number, number];
  sides: { top: SideStats; bottom: SideStats; left: SideStats; right: SideStats };
  /** Relative luminance of `median`, 0..1. */
  lightness: number;
  /** Largest per-channel standard deviation over the whole ring. */
  deviation: number;
  /** Per-channel gain that maps `median` onto 255, clamped to MAX_GAIN. */
  gain: [number, number, number] | null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function deviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** sRGB relative luminance (WCAG), 0..1. */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface RingSamples {
  top: number[][];
  bottom: number[][];
  left: number[][];
  right: number[][];
}

function ringSamples(image: RgbaImage, ring: number): RingSamples {
  const { data, width, height } = image;
  const at = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };
  const top: number[][] = [];
  const bottom: number[][] = [];
  const left: number[][] = [];
  const right: number[][] = [];
  for (let y = 0; y < Math.min(ring, height); y += 1) {
    for (let x = 0; x < width; x += 1) top.push(at(x, y));
  }
  for (let y = Math.max(0, height - ring); y < height; y += 1) {
    for (let x = 0; x < width; x += 1) bottom.push(at(x, y));
  }
  for (let x = 0; x < Math.min(ring, width); x += 1) {
    for (let y = 0; y < height; y += 1) left.push(at(x, y));
  }
  for (let x = Math.max(0, width - ring); x < width; x += 1) {
    for (let y = 0; y < height; y += 1) right.push(at(x, y));
  }
  return { top, bottom, left, right };
}

function sideStats(pixels: number[][]): SideStats {
  const medianRgb: [number, number, number] = [
    median(pixels.map((px) => px[0])),
    median(pixels.map((px) => px[1])),
    median(pixels.map((px) => px[2])),
  ];
  const largestDeviation = Math.max(
    deviation(pixels.map((px) => px[0])),
    deviation(pixels.map((px) => px[1])),
    deviation(pixels.map((px) => px[2])),
  );
  return { median: medianRgb, deviation: largestDeviation };
}

/** Per-channel gain that maps a backdrop to pure white, clamped. */
export function gainForBackdrop(
  medianRgb: [number, number, number],
): [number, number, number] | null {
  const gains = medianRgb.map((value) => (value <= 1 ? Infinity : 255 / value));
  if (gains.some((gain) => !Number.isFinite(gain))) return null;
  return gains.map((gain) => Math.min(gain, MAX_GAIN)) as [number, number, number];
}

/** Multiplies the RGB channels by the gain and writes a new buffer. */
export function applyGain(image: RgbaImage, gain: [number, number, number]): Uint8Array {
  const out = new Uint8Array(image.data.length);
  for (let i = 0; i < image.data.length; i += 4) {
    out[i] = Math.min(255, Math.round(image.data[i] * gain[0]));
    out[i + 1] = Math.min(255, Math.round(image.data[i + 1] * gain[1]));
    out[i + 2] = Math.min(255, Math.round(image.data[i + 2] * gain[2]));
    out[i + 3] = image.data[i + 3];
  }
  return out;
}

/**
 * Decides whether a photo's backdrop can be normalised onto pure white.
 *
 * The order matters: a real alpha channel wins (nothing to normalise), then the
 * four sides must agree (gradient/vignette), then the backdrop must be light,
 * then the ring must be quiet. A bright subject touching the edge is caught by
 * the variance test even when its average is light.
 */
export function analyseBackdrop(image: RgbaImage, ring = RING): BackdropAnalysis {
  const { width, height } = image;
  if (width < ring * 2 || height < ring * 2 || image.data.length < width * height * 4) {
    return {
      eligible: false,
      reason: "channel",
      median: [0, 0, 0],
      sides: {
        top: { median: [0, 0, 0], deviation: 0 },
        bottom: { median: [0, 0, 0], deviation: 0 },
        left: { median: [0, 0, 0], deviation: 0 },
        right: { median: [0, 0, 0], deviation: 0 },
      },
      lightness: 0,
      deviation: 0,
      gain: null,
    };
  }

  const samples = ringSamples(image, ring);
  const all = [...samples.top, ...samples.bottom, ...samples.left, ...samples.right];

  if (all.some((px) => px[3] < 250)) {
    const sides = {
      top: sideStats(samples.top),
      bottom: sideStats(samples.bottom),
      left: sideStats(samples.left),
      right: sideStats(samples.right),
    };
    const medianRgb: [number, number, number] = [
      median(all.map((px) => px[0])),
      median(all.map((px) => px[1])),
      median(all.map((px) => px[2])),
    ];
    return {
      eligible: false,
      reason: "alpha",
      median: medianRgb,
      sides,
      lightness: relativeLuminance(medianRgb),
      deviation: 0,
      gain: null,
    };
  }

  const sides = {
    top: sideStats(samples.top),
    bottom: sideStats(samples.bottom),
    left: sideStats(samples.left),
    right: sideStats(samples.right),
  };
  const medianRgb: [number, number, number] = [
    median(all.map((px) => px[0])),
    median(all.map((px) => px[1])),
    median(all.map((px) => px[2])),
  ];
  const lightness = relativeLuminance(medianRgb);
  const largestDeviation = Math.max(
    sides.top.deviation,
    sides.bottom.deviation,
    sides.left.deviation,
    sides.right.deviation,
    deviation(all.map((px) => px[0])),
    deviation(all.map((px) => px[1])),
    deviation(all.map((px) => px[2])),
  );

  const sideMedians = [sides.top.median, sides.bottom.median, sides.left.median, sides.right.median];
  let disagreement = 0;
  for (let channel = 0; channel < 3; channel += 1) {
    const values = sideMedians.map((side) => side[channel]);
    disagreement = Math.max(disagreement, Math.max(...values) - Math.min(...values));
  }

  const gain = gainForBackdrop(medianRgb);
  const base = { median: medianRgb, sides, lightness, deviation: largestDeviation, gain };

  if (disagreement > SIDE_TOLERANCE) return { ...base, eligible: false, reason: "gradient" };
  if (lightness < MIN_LIGHTNESS) return { ...base, eligible: false, reason: "too-dark" };
  if (largestDeviation > MAX_VARIANCE) return { ...base, eligible: false, reason: "noisy" };
  if (!gain) return { ...base, eligible: false, reason: "channel" };
  return { ...base, eligible: true, reason: "eligible" };
}
