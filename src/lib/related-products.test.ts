import { describe, it, expect } from "vitest";
import type { Product, ProductSize } from "@/types";
import { selectRelatedProducts } from "./related-products";

const size = (inStock = true): ProductSize => ({
  label: "50 مل",
  price: 400,
  inStock,
});

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    sku: overrides.id,
    slug: overrides.id.toLowerCase(),
    name: overrides.id,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${overrides.id}.png`,
    gender: "رجالي",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 0,
    sizes: [size()],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

const current = product({ id: "current" });

describe("selectRelatedProducts", () => {
  it("matches on gender and style only", () => {
    const catalogue = [
      current,
      product({ id: "same" }),
      product({ id: "other-gender", gender: "نسائي" }),
      product({ id: "other-style", type: "غربي" }),
    ];
    expect(selectRelatedProducts(current, catalogue).map((p) => p.id)).toEqual([
      "same",
    ]);
  });

  it("excludes the product being viewed", () => {
    expect(
      selectRelatedProducts(current, [current]).map((p) => p.id),
    ).not.toContain("current");
  });

  it("never recommends hidden, sold-out or coming-soon products", () => {
    const catalogue = [
      product({ id: "hidden", hidden: true }),
      product({ id: "sold-out", sizes: [size(false)] }),
      product({ id: "coming", image: "/products/placeholder-unavailable.webp" }),
      product({ id: "real" }),
    ];
    expect(selectRelatedProducts(current, catalogue).map((p) => p.id)).toEqual([
      "real",
    ]);
  });

  it("orders featured first, then the owner's order, then name", () => {
    const catalogue = [
      product({ id: "b", sortOrder: 2 }),
      product({ id: "a", sortOrder: 1 }),
      product({ id: "featured", featured: true, sortOrder: 9 }),
    ];
    expect(selectRelatedProducts(current, catalogue).map((p) => p.id)).toEqual([
      "featured",
      "a",
      "b",
    ]);
  });

  it("stops at four", () => {
    const catalogue = Array.from({ length: 7 }, (_, index) =>
      product({ id: `p${index}` }),
    );
    expect(selectRelatedProducts(current, catalogue)).toHaveLength(4);
  });

  it("returns an empty list when nothing is similar", () => {
    expect(selectRelatedProducts(current, [])).toEqual([]);
  });
});
