import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadProducts } from "./products";
import { filterProducts } from "@/lib/filter-helpers";
import { sortProducts } from "@/lib/sort-helpers";
import type { Product } from "@/types";

/**
 * Regression guard for the "0 products" bug:
 * a schema change silently removed every product from the homepage because
 * validation/filtering dropped them all. These tests ensure the catalog stays
 * non-empty end-to-end and that per-size `inStock` never hides whole products.
 */

// Read the expected count dynamically from the source file so this test does
// not need updating when products are added/removed. (Currently 47.)
function readExpectedProductCount(): number {
  const raw = readFileSync(
    join(process.cwd(), "data", "products.json"),
    "utf-8",
  );
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.length : 1;
}

describe("products data integrity", () => {
  let products: Product[];

  beforeAll(async () => {
    products = await loadProducts();
  });

  it("loads a non-empty product list from data/products.json", () => {
    expect(products.length).toBeGreaterThan(0);
    // Exact count is derived from the JSON itself (currently 47), not hardcoded.
    expect(products.length).toBe(expectedProductCount());
  });

  it("returns the full list with no filters and default (best-selling) sort", () => {
    const filtered = filterProducts(products, {});
    const sorted = sortProducts(filtered, "best-selling");
    // filterProducts({}) and sortProducts with no salesCounts must be no-ops.
    expect(filtered).toHaveLength(products.length);
    expect(sorted).toHaveLength(products.length);
    // The default sort must not reorder to zero, and must include every id.
    const sortedIds = sorted.map((p) => p.id);
    expect(new Set(sortedIds).size).toBe(products.length);
  });

  it("keeps a product in the list even when its overall inStock is false", () => {
    const target = products[0];
    expect(target).toBeDefined();
    const modified: Product[] = products.map((p) =>
      p.id === target.id ? { ...p, inStock: false } : p,
    );

    const filtered = filterProducts(modified, {});
    // A product-level inStock=false must NOT remove the product from the
    // full list — it only affects its own availability display.
    expect(filtered).toHaveLength(products.length);
    expect(filtered.some((p) => p.id === target.id)).toBe(true);
  });

  it("keeps a product in the list even when ALL its sizes are out of stock", () => {
    const target = products[0];
    const modified: Product[] = products.map((p) =>
      p.id === target.id
        ? {
            ...p,
            inStock: false,
            sizes: p.sizes.map((s) => ({ ...s, inStock: false })),
          }
        : p,
    );

    const filtered = filterProducts(modified, {});
    expect(filtered).toHaveLength(products.length);
    expect(filtered.some((p) => p.id === target.id)).toBe(true);
  });
});

// Hoisted helper — keeps the expected count available before the suite runs.
function expectedProductCount(): number {
  return readExpectedProductCount();
}
