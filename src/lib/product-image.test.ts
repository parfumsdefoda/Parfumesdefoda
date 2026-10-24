import { describe, it, expect } from "vitest";
import { buildProductImageSources, getProductImageEntry, imageSlug } from "./product-image";

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
