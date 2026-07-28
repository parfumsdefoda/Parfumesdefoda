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

  it("sorts by rating", () => {
    const result = sortProducts(mockProducts, "rating");
    expect(result[0].id).toBe("2");
  });

  it("sorts by featured", () => {
    const result = sortProducts(mockProducts, "featured");
    expect(result[0].id).toBe("1");
  });

  it("does not mutate original array", () => {
    const original = [...mockProducts];
    sortProducts(mockProducts, "price-asc");
    expect(mockProducts).toEqual(original);
  });
});
