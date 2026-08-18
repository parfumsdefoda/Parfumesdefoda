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
  sku: "1",
  slug: "test",
  name: "Test",
  brand: "Brand",
  description: "Desc",
  image: "/test.webp",
  gallery: ["/test.webp"],
  gender: "للجنسين",
  type: "شرقي",
  house: "نيش",
  oily: false,
  fodaOriginal: false,
  season: "صيفي",
  performance: "أداء قوي",
  featured: false,
  badge: "",
  rating: 0,
  reviews: 0,
  status: "active",
  sortOrder: 1,
  sizes: [{ label: "50ml", price: 100, inStock: true }],
  inStock: true,
  notes: { top: [], middle: [], base: [] },
  seo: { title: "Test", description: "" },
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

  it("returns false when inStock is not a boolean", () => {
    expect(isValidProduct({ ...validProduct, inStock: 1 })).toBe(false);
  });

  it("returns false when a size lacks inStock", () => {
    const bad = {
      ...validProduct,
      sizes: [{ label: "50ml", price: 100 }],
    };
    expect(isValidProduct(bad)).toBe(false);
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
    expect(isProductInStock({ ...validProduct, inStock: false })).toBe(false);
  });

  it("checks specific size stock", () => {
    expect(isProductInStock(validProduct, "50ml")).toBe(true);
  });

  it("returns false when requested size is out of stock", () => {
    const product = {
      ...validProduct,
      sizes: [{ label: "50ml", price: 100, inStock: false }],
    };
    expect(isProductInStock(product, "50ml")).toBe(false);
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
