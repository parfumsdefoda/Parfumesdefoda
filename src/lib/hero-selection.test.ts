import { describe, it, expect } from "vitest";
import { selectHeroShowcase } from "./hero-selection";
import type { Product } from "@/schemas/product-schema";

// ─── Test Data ──────────────────────────────────────────────────────────────

function makeProduct(id: string, featured: boolean, status = "active"): Product {
  return {
    id,
    sku: id,
    slug: id.toLowerCase(),
    name: `عطر ${id}`,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${id}.png`,
    gallery: [`/products/${id}.png`],
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured,
    badge: "",
    rating: 0,
    reviews: 0,
    status,
    sortOrder: 0,
    sizes: [{ label: "50 مل", price: 500, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
  };
}

const products: Product[] = [
  ...Array.from({ length: 5 }, (_, i) => makeProduct(`PF${i + 1}`, true)), // 5 featured
  ...Array.from({ length: 20 }, (_, i) => makeProduct(`PF${i + 10}`, false)), // 20 regular
];

// ─── selectHeroShowcase ─────────────────────────────────────────────────────

describe("selectHeroShowcase", () => {
  it("returns only active products", () => {
    const withInactive = [...products, makeProduct("PF999", true, "inactive")];
    const result = selectHeroShowcase(withInactive);
    expect(result.some((i) => i.id === "PF999")).toBe(false);
  });

  it("puts all featured (فاخر) products first", () => {
    const result = selectHeroShowcase(products, 12);
    const featuredCount = result.filter((i) => i.featured).length;
    expect(featuredCount).toBe(5); // all 5 featured made the cut
    // First `featuredCount` items are all featured
    for (let i = 0; i < featuredCount; i++) {
      expect(result[i].featured).toBe(true);
    }
    // The rest are not featured
    for (let i = featuredCount; i < result.length; i++) {
      expect(result[i].featured).toBe(false);
    }
  });

  it("respects the total cap", () => {
    expect(selectHeroShowcase(products, 3).length).toBe(3);
    expect(selectHeroShowcase(products, 999).length).toBe(products.length);
  });

  it("never duplicates a product id", () => {
    const result = selectHeroShowcase(products, 12);
    const ids = new Set(result.map((i) => i.id));
    expect(ids.size).toBe(result.length);
  });

  it("returns empty array for empty input", () => {
    expect(selectHeroShowcase([])).toEqual([]);
  });

  it("preserves the featured flag on each item", () => {
    const result = selectHeroShowcase(products, 12);
    for (const item of result) {
      const source = products.find((p) => p.id === item.id);
      expect(item.featured).toBe(source?.featured);
    }
  });
});