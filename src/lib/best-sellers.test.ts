import { describe, expect, it } from "vitest";
import { selectBestSellers } from "./best-sellers";
import type { Product } from "@/types";

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    sku: overrides.id,
    slug: overrides.id.toLowerCase(),
    name: overrides.id,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${overrides.id}.png`,
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    season: "صيفي",
    performance: "أداء قوي",
    featured: false,
    sortOrder: 0,
    sizes: [{ label: "50 مل", price: 500, inStock: true }],
    inStock: true,
    ...overrides,
  } as Product;
}

describe("selectBestSellers", () => {
  it("orders by sales count", () => {
    const products = [product({ id: "A" }), product({ id: "B" }), product({ id: "C" })];
    const row = selectBestSellers(products, { A: 2, B: 9, C: 4 });
    expect(row.map((p) => p.id)).toEqual(["B", "C", "A"]);
  });

  it("falls back to featured, then sortOrder, when there are no counts", () => {
    const products = [
      product({ id: "A", sortOrder: 3 }),
      product({ id: "B", featured: true, sortOrder: 9 }),
      product({ id: "C", sortOrder: 1 }),
    ];
    const row = selectBestSellers(products, {});
    expect(row.map((p) => p.id)).toEqual(["B", "C", "A"]);
  });

  it("never shows hidden, unphotographed or unbuyable products", () => {
    const products = [
      product({ id: "HIDDEN", hidden: true }),
      product({ id: "PENDING", image: "/products/placeholder-unavailable.webp" }),
      product({ id: "EMPTY", sizes: [{ label: "50 مل", price: 500, inStock: false }] }),
      product({ id: "OK" }),
    ];
    const row = selectBestSellers(products, { HIDDEN: 50, PENDING: 40 });
    expect(row.map((p) => p.id)).toEqual(["OK"]);
  });

  it("honours the limit and is stable for ties", () => {
    const products = ["A", "B", "C"].map((id, index) =>
      product({ id, sortOrder: index }),
    );
    expect(selectBestSellers(products, {}, 2).map((p) => p.id)).toEqual(["A", "B"]);
    expect(selectBestSellers(products, { A: 1, B: 1 }, 3).map((p) => p.id)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("ignores negative or non-numeric counts", () => {
    const products = [product({ id: "A" }), product({ id: "B", featured: true })];
    const row = selectBestSellers(products, { A: -5, B: Number.NaN });
    expect(row.map((p) => p.id)).toEqual(["B", "A"]);
  });
});
