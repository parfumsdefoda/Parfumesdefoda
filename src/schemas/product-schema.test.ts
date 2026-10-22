import { describe, it, expect } from "vitest";
import catalog from "@/../data/products.json";
import { productSchema, type Product } from "./product-schema";

/** The real catalogue, typed through the schema rather than the JSON literal. */
const products = catalog as unknown as Product[];

/** A real catalogue row — the shape every product must keep validating. */
const base = products[0];

describe("productSchema — optional enrichment", () => {
  it("accepts every catalogue product with none of the new fields", () => {
    for (const product of products) {
      expect(product.concentration).toBeUndefined();
      expect(product.family).toBeUndefined();
      const result = productSchema.safeParse(product);
      expect(result.success, product.slug).toBe(true);
    }
  });

  it("keeps per-size ml and sku optional", () => {
    const withExtras = {
      ...base,
      sizes: base.sizes.map((size) => ({ ...size, ml: 50, sku: "PF020-50" })),
    };
    expect(productSchema.safeParse(withExtras).success).toBe(true);

    const withoutMl = {
      ...base,
      sizes: base.sizes.map(({ label, price, inStock }) => ({ label, price, inStock })),
    };
    expect(productSchema.safeParse(withoutMl).success).toBe(true);
  });

  it("keeps gallery optional — `image` stays the contract", () => {
    const withoutGallery = { ...base };
    delete (withoutGallery as { gallery?: string[] }).gallery;
    expect(productSchema.safeParse(withoutGallery).success).toBe(true);
  });

  it("rejects a size with a non-positive ml", () => {
    const bad = {
      ...base,
      sizes: [{ ...base.sizes[0], ml: 0 }],
    };
    expect(productSchema.safeParse(bad).success).toBe(false);

    const negative = {
      ...base,
      sizes: [{ ...base.sizes[0], ml: -10 }],
    };
    expect(productSchema.safeParse(negative).success).toBe(false);
  });

  it("accepts each declared concentration and family", () => {
    for (const concentration of ["parfum", "edp", "edt", "edc", "oil"]) {
      expect(productSchema.safeParse({ ...base, concentration }).success).toBe(true);
    }
    for (const family of [
      "aromatic",
      "citrus",
      "floral",
      "fougere",
      "fresh",
      "gourmand",
      "leather",
      "musk",
      "oriental",
      "woody",
    ]) {
      expect(productSchema.safeParse({ ...base, family }).success).toBe(true);
    }
  });

  it("rejects unknown enum values", () => {
    expect(productSchema.safeParse({ ...base, concentration: "extrait" }).success).toBe(
      false,
    );
    expect(productSchema.safeParse({ ...base, family: "spicy" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, concentration: "EDP" }).success).toBe(
      false,
    );
  });
});
