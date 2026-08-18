import { describe, it, expect } from "vitest";
import { sortProducts } from "./sort-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    sku: "1",
    slug: "a",
    name: "ب",
    brand: "B",
    description: "",
    image: "",
    gallery: [],
    gender: "رجالي",
    type: "شرقي",
    house: "ديزاينر",
    oily: false,
    fodaOriginal: false,
    season: "صيفي",
    performance: "أداء قوي",
    featured: true,
    badge: "",
    rating: 3,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [{ label: "50ml", price: 200, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
  },
  {
    id: "2",
    sku: "2",
    slug: "b",
    name: "أ",
    brand: "A",
    description: "",
    image: "",
    gallery: [],
    gender: "رجالي",
    type: "غربي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 5,
    reviews: 0,
    status: "active",
    sortOrder: 2,
    sizes: [{ label: "50ml", price: 100, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
  },
];

describe("sortProducts", () => {
  it("sorts by price ascending", () => {
    const result = sortProducts(mockProducts, "price-asc");
    expect(result[0].id).toBe("2");
  });

  it("sorts by price descending", () => {
    const result = sortProducts(mockProducts, "price-desc");
    expect(result[0].id).toBe("1");
  });

  it("sorts by best-selling using sales counts (descending)", () => {
    const salesCounts = { "1": 5, "2": 10 };
    const result = sortProducts(mockProducts, "best-selling", salesCounts);
    expect(result.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("keeps original order for best-selling when sales counts are missing", () => {
    const result = sortProducts(mockProducts, "best-selling");
    expect(result.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("sorts products with missing/zero sales counts last, ties stay stable", () => {
    const salesCounts = { "2": 3 };
    const result = sortProducts(mockProducts, "best-selling", salesCounts);
    expect(result.map((p) => p.id)).toEqual(["2", "1"]);

    const tieResult = sortProducts(
      mockProducts,
      "best-selling",
      { "1": 3, "2": 3 },
    );
    expect(tieResult.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("sorts alphabetically", () => {
    const result = sortProducts(mockProducts, "alphabetical");
    expect(result[0].id).toBe("2");
  });

  it("does not mutate original array", () => {
    const original = [...mockProducts];
    sortProducts(mockProducts, "price-asc");
    expect(mockProducts).toEqual(original);
  });
});