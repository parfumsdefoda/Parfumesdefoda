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
  it("resolves a gallery view through its own image path", () => {
    expect(getProductImageEntry("pf091")).not.toBeNull();

    // A gallery entry is keyed by the IMAGE path, so a second view resolves like
    // the cover. No visible product carries a second view right now (the master
    // has an empty gallery_extra on every row), so this pins the mechanism on a
    // real product's cover rather than on a row that no longer exists.
    const sources = buildProductImageSources(imageSlug("/products/PF091.png"), "pdp");
    expect(sources?.webp).toContain("/products/derived/pf091/");
    expect(sources?.avif).toContain("/products/derived/pf091/");
  });

  it("has no entry for a product that is gone", () => {
    // pf231 was removed from the master, hidden and its derivatives pruned.
    expect(getProductImageEntry("pf231")).toBeNull();
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
    // pf090 is listed in .audit/needs-retouch.txt: a coloured background
    // served as a framed resize, so it keeps the light stage.
    const entry = getProductImageEntry("pf090");
    expect(entry?.background).not.toBe("transparent");
    expect(hasTransparentCutout("pf090")).toBe(false);
  });

  it("is true for pf091, whose manifest entry the refresh corrected", () => {
    // The stored entry carried pf090's hash and background; the real PF091.png
    // is a transparent 2000×2000 cut-out, so the premium stage may go dark.
    expect(getProductImageEntry("pf091")?.background).toBe("transparent");
    expect(hasTransparentCutout("pf091")).toBe(true);
  });

  it("is false when there is no derived entry at all", () => {
    expect(hasTransparentCutout("pf-unknown")).toBe(false);
    expect(hasTransparentCutout(null)).toBe(false);
  });
});
