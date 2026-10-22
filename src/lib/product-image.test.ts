import { describe, it, expect } from "vitest";
import manifest from "@/data/image-manifest.json";
import {
  buildProductImageSources,
  getProductImageEntry,
} from "./product-image";

const slugs = Object.keys(manifest.products);
const firstSlug = slugs[0];

describe("getProductImageEntry", () => {
  it("returns the manifest entry for a derived product", () => {
    const entry = getProductImageEntry(firstSlug);
    expect(entry).not.toBeNull();
    expect(entry?.source).toMatch(/^\/products\//);
    expect(entry?.files.length).toBeGreaterThan(0);
  });

  it("returns null for unknown or missing slugs", () => {
    expect(getProductImageEntry("no-such-product")).toBeNull();
    expect(getProductImageEntry(undefined)).toBeNull();
    expect(getProductImageEntry(null)).toBeNull();
    expect(getProductImageEntry("")).toBeNull();
  });
});

describe("buildProductImageSources", () => {
  it("returns null when the product has no derivatives", () => {
    expect(buildProductImageSources("no-such-product", "card")).toBeNull();
    expect(buildProductImageSources(undefined, "pdp")).toBeNull();
  });

  it("builds a card srcset that never exceeds 800w", () => {
    const sources = buildProductImageSources(firstSlug, "card");
    expect(sources).not.toBeNull();
    const widths = sources?.srcSet
      .split(", ")
      .map((entry) => Number(entry.split(" ")[1].replace("w", "")));
    expect(widths).toEqual([...widths!].sort((a, b) => a - b));
    expect(Math.max(...widths!)).toBeLessThanOrEqual(800);
    expect(sources?.avif).toMatch(/card-400\.avif 400w/);
  });

  it("offers the 2000w webp on the product page", () => {
    const sources = buildProductImageSources(firstSlug, "pdp");
    expect(sources).not.toBeNull();
    const webpWidths = sources?.webp
      .split(", ")
      .map((entry) => Number(entry.split(" ")[1].replace("w", "")));
    expect(webpWidths).toEqual([400, 800, 1200, 2000]);
    // The 2000px tier is WebP-only by design.
    expect(sources?.avif).not.toContain("2000w");
  });

  it("points the plain src at the largest webp in the tier", () => {
    const sources = buildProductImageSources(firstSlug, "pdp");
    expect(sources?.src).toMatch(/pdp-2000\.webp$/);
    expect(sources?.width).toBe(2000);
    expect(sources?.height).toBe(2000);
  });

  it("carries the blend mode from the manifest", () => {
    for (const slug of slugs) {
      const entry = getProductImageEntry(slug);
      const sources = buildProductImageSources(slug, "card");
      expect(sources?.blend).toBe(entry?.blend);
      expect(["normal", "multiply"]).toContain(sources?.blend);
    }
  });

  it("every derived entry is square and has a webp tier", () => {
    for (const slug of slugs) {
      const entry = getProductImageEntry(slug)!;
      for (const file of entry.files) {
        expect(file.webp).toMatch(new RegExp(`${slug}/`));
        expect(file.w).toBeGreaterThan(0);
      }
      expect(entry.files.some((file) => file.avif)).toBe(true);
    }
  });
});
