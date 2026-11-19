import { describe, expect, it } from "vitest";
import {
  applyGain,
  analyseBackdrop,
  gainForBackdrop,
  MAX_GAIN,
  relativeLuminance,
  type RgbaImage,
} from "./backdrop";

/** Builds an RGBA image from a per-pixel colour function. */
function image(
  width: number,
  height: number,
  colour: (x: number, y: number) => [number, number, number, number?],
): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = colour(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height };
}

const flat = (value: number) => image(40, 40, () => [value, value, value]);
const box = (colour: [number, number, number]) => image(40, 40, () => colour);

describe("analyseBackdrop", () => {
  it("accepts a pure white backdrop with a neutral gain", () => {
    const result = analyseBackdrop(flat(255));
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
    expect(result.gain).toEqual([1, 1, 1]);
    expect(result.lightness).toBeCloseTo(1, 3);
  });

  it("accepts a flat light grey and brightens it to white", () => {
    const result = analyseBackdrop(flat(245));
    expect(result.eligible).toBe(true);
    expect(result.gain?.[0]).toBeCloseTo(255 / 245, 5);
  });

  it("rejects a light-looking grey whose luminance is still under 0.82", () => {
    // 230 grey is 0.79 luminance: visually light, but outside the rule.
    const result = analyseBackdrop(flat(230));
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("too-dark");
  });

  it("clamps a cold-cast grey at MAX_GAIN instead of over-brightening it", () => {
    // A blue-ish white wall is light enough overall, but its red channel is not.
    const result = analyseBackdrop(box([200, 255, 255]));
    expect(result.eligible).toBe(true);
    expect(result.gain?.[0]).toBe(MAX_GAIN);
    expect(255 / 200).toBeGreaterThan(MAX_GAIN);
  });

  it("rejects a vignette whose sides disagree", () => {
    const vignette = image(40, 40, (x) =>
      x < 6 || x >= 34 ? [235, 235, 235] : [255, 255, 255],
    );
    const result = analyseBackdrop(vignette);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("gradient");
  });

  it("rejects a coloured backdrop", () => {
    const result = analyseBackdrop(box([30, 60, 180]));
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("too-dark");
    expect(result.lightness).toBeLessThan(0.82);
  });

  it("rejects a dark backdrop", () => {
    const result = analyseBackdrop(flat(20));
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("too-dark");
  });

  it("rejects a bright subject that touches the border ring", () => {
    // Alternating 215/255: light enough on average, far too busy to be a wall.
    const subject = image(40, 40, (x) => ((x + 1) % 2 === 0 ? [215, 215, 215] : [255, 255, 255]));
    const result = analyseBackdrop(subject);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("noisy");
    expect(result.deviation).toBeGreaterThan(10);
  });

  it("never normalises a photo that already has alpha", () => {
    const cutout = image(40, 40, (_x, y) => (y < 3 ? [255, 255, 255, 0] : [200, 200, 200]));
    const result = analyseBackdrop(cutout);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("alpha");
    expect(result.gain).toBeNull();
  });
});

describe("gainForBackdrop", () => {
  it("returns null when a channel has nothing to divide by", () => {
    expect(gainForBackdrop([0, 200, 200])).toBeNull();
  });

  it("uses one gain per channel", () => {
    const gain = gainForBackdrop([250, 240, 230]);
    expect(gain).toHaveLength(3);
    expect(gain![0]).toBeCloseTo(255 / 250, 5);
    expect(gain![2]).toBeCloseTo(255 / 230, 5);
  });
});

describe("applyGain", () => {
  it("brightens the backdrop, clamps at 255 and keeps alpha", () => {
    const source = image(2, 1, (x) => (x === 0 ? [240, 240, 240, 255] : [10, 10, 10, 128]));
    const out = applyGain(source, [1.1, 1.1, 1.1]);
    expect(out[0]).toBe(255); // 264 clamped
    expect(out[3]).toBe(255);
    expect(out[4]).toBe(11); // 11 exactly
    expect(out[7]).toBe(128);
  });
});

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });
});
