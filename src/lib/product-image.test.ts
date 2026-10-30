import { describe, it, expect } from "vitest";
import {
  buildProductImageSources,
  getProductImageEntry,
  hasTransparentCutout,
  imageSlug,
} from "./product-image";

describe("imageSlug", () => {
  it("maps an original product path to its manifest key", () => {
    expect(imageSlug("/products/PF020.png")).toBe("pf020");
    expect(imageSlug("/products/PF091.png")).toBe("pf091");
  });

  it("returns null for nothing", () => {
    expect(imageSlug(undefined)).toBeNull();
    expect(imageSlug("")).toBeNull();
  });
});

describe("derived gallery assets", () => {
  it("resolves an extra gallery view like a cover", () => {
    expect(getProductImageEntry("pf091")).not.toBeNull();
    expect(getProductImageEntry("pf231")).not.toBeNull();

    const sources = buildProductImageSources(imageSlug("/products/PF091.png"), "pdp");
    expect(sources?.webp).toContain("/products/derived/pf091/");
    expect(sources?.avif).toContain("/products/derived/pf091/");
  });

  it("still falls back to the original for an unknown image", () => {
    expect(buildProductImageSources("pf-unknown", "card")).toBeNull();
  });
});

describe("hasTransparentCutout", () => {
  it("is true for a transparent cut-out", () => {
    // pf240 is the catalogue's premium (فاخر) cut-out — the dark stage case.
    expect(hasTransparentCutout("pf240")).toBe(true);
  });

  it("is false for a framed photo that still carries its background", () => {
    // pf091 is listed in .audit/needs-retouch.txt: a coloured background
    // served as a framed resize, so it keeps the light stage.
    const entry = getProductImageEntry("pf091");
    expect(entry?.background).not.toBe("transparent");
    expect(hasTransparentCutout("pf091")).toBe(false);
  });

  it("is false when there is no derived entry at all", () => {
    expect(hasTransparentCutout("pf-unknown")).toBe(false);
    expect(hasTransparentCutout(null)).toBe(false);
  });
});
