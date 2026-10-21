import { describe, it, expect } from "vitest";
import {
  BRAND,
  CONTRAST_PAIRS,
  PALETTE,
  buildPalette,
  contrastRatio,
  hexToRgb,
  mix,
  relativeLuminance,
  rgbToHex,
} from "./design-tokens";

describe("contrastRatio", () => {
  it("returns 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
  });

  it("returns 1:1 for identical colours", () => {
    expect(contrastRatio("#632989", "#632989")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#632989", "#FFFFFF")).toBe(
      contrastRatio("#FFFFFF", "#632989"),
    );
  });
});

describe("colour helpers", () => {
  it("parses shorthand hex", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("round-trips through hex", () => {
    expect(rgbToHex({ r: 99, g: 41, b: 137 })).toBe("#632989");
  });

  it("reproduces color-mix(in srgb, …) exactly", () => {
    // 50% #000000 + 50% #FFFFFF is the mid grey.
    expect(mix("#000000", "#FFFFFF", 50)).toBe("#808080");
  });

  it("luminance of white is 1 and of black is 0", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });
});

describe("palette", () => {
  it("derives text-safe gold from the brand gold", () => {
    // --gold-700 is color-mix(in srgb, brand-gold 62%, black)
    expect(PALETTE["gold-700"]).toBe(mix(BRAND.gold, "#000000", 62));
    expect(contrastRatio(PALETTE["gold-700"], PALETTE.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("derives text-safe green from the brand green", () => {
    expect(PALETTE.positive).toBe(mix(BRAND.green, "#12340A", 40));
    expect(contrastRatio(PALETTE.positive, PALETTE.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the base brand purple readable as text", () => {
    expect(contrastRatio(PALETTE.brand, PALETTE.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("re-derives every scale when the brand palette changes", () => {
    const alternate = buildPalette({
      purple: "#123456",
      gold: "#C9A227",
      green: "#4C9A2A",
      white: "#FFFFFF",
    });
    expect(alternate["purple-600"]).toBe("#123456");
    expect(alternate["gold-500"]).toBe("#C9A227");
    expect(alternate["green-700"]).not.toBe(PALETTE["green-700"]);
  });
});

describe("WCAG contract for the default theme", () => {
  it("has a pair for every text role the site renders", () => {
    expect(CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(20);
  });

  it.each(CONTRAST_PAIRS.map((pair) => [pair.label, pair] as const))(
    "%s meets its WCAG minimum",
    (_label, pair) => {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(
        ratio,
        `${pair.label}: ${pair.foreground} on ${pair.background}`,
      ).toBeGreaterThanOrEqual(pair.min);
    },
  );
});
