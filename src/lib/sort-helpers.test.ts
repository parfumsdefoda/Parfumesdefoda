import { describe, it, expect } from "vitest";
import { sortProducts } from "./sort-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "a",
    name: "ب",
    brand: "B",
    description: "",
    gender: "رجالي",
    categories: [],
    type: "normal",
    image: "",
    sizes: [{ label: "50ml", price: 200 }],
    stock: 10,
    rating: 3,
    featured: true,
  },
  {
    id: "2",
    slug: "b",
    name: "أ",
    brand: "A",
    description: "",
    gender: "رجالي",
    categories: [],
    type: "normal",
    image: "",
    sizes: [{ label: "50ml", price: 100 }],
    stock: 10,
    rating: 5,
    featured: false,
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
