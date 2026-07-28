import { describe, it, expect } from "vitest";
import {
  isValidProduct,
  validateProducts,
  isProductInStock,
  findProductById,
  findProductBySlug,
  getFeaturedProducts,
} from "./product-helpers";
import type { Product } from "@/types";

const validProduct: Product = {
  id: "1",
  slug: "test",
  name: "Test",
  brand: "Brand",
  description: "Desc",
  gender: "male",
  categories: ["cat"],
  type: "normal",
  image: "/test.webp",
  sizes: [{ label: "50ml", price: 100 }],
  stock: 10,
};

describe("isValidProduct", () => {
  it("returns true for valid product", () => {
    expect(isValidProduct(validProduct)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidProduct(null)).toBe(false);
  });

  it("returns false for missing required fields", () => {
    expect(isValidProduct({ id: "1" })).toBe(false);
  });
});

describe("validateProducts", () => {
  it("filters out invalid products", () => {
    const result = validateProducts([validProduct, null, { id: "bad" }]);
    expect(result).toHaveLength(1);
  });
});

describe("isProductInStock", () => {
  it("returns true when in stock", () => {
    expect(isProductInStock(validProduct)).toBe(true);
  });

  it("returns false when out of stock", () => {
    expect(isProductInStock({ ...validProduct, stock: 0 })).toBe(false);
  });

  it("checks specific size stock", () => {
    expect(isProductInStock(validProduct, "50ml")).toBe(true);
  });
});

describe("findProductById", () => {
  it("finds product by id", () => {
    expect(findProductById([validProduct], "1")).toBe(validProduct);
  });

  it("returns undefined for missing id", () => {
    expect(findProductById([validProduct], "999")).toBeUndefined();
  });
});

describe("findProductBySlug", () => {
  it("finds product by slug", () => {
    expect(findProductBySlug([validProduct], "test")).toBe(validProduct);
  });
});

describe("getFeaturedProducts", () => {
  it("filters featured products", () => {
    const featured = { ...validProduct, featured: true };
    const notFeatured = { ...validProduct, id: "2", featured: false };
    expect(getFeaturedProducts([featured, notFeatured])).toHaveLength(1);
  });
});
