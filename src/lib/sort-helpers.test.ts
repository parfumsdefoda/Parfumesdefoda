import { describe, it, expect } from "vitest";
import { sortProducts } from "./sort-helpers";
import type { Product } from "@/types";

function product(
  id: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    sku: id,
    slug: id.toLowerCase(),
    name: id,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${id}.png`,
    gender: "للجنسين",
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
    sizes: [{ label: "50 مل", price: 500, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

describe("sortProducts", () => {
  it("puts featured products first and keeps the rest in catalogue order", () => {
    const list = [
      product("a"),
      product("b", { featured: true }),
      product("c"),
      product("d", { featured: true }),
    ];

    expect(sortProducts(list, "featured").map((p) => p.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("sorts price ascending by the cheapest buyable size", () => {
    const list = [
      // The first size is expensive; the 10ml one is what the card shows.
      product("expensive", {
        sizes: [
          { label: "100 مل", price: 900, inStock: true },
          { label: "10 مل", price: 220, inStock: true },
        ],
      }),
      product("cheap", {
        sizes: [{ label: "10 مل", price: 120, inStock: true }],
      }),
    ];

    expect(sortProducts(list, "price-asc").map((p) => p.id)).toEqual([
      "cheap",
      "expensive",
    ]);
  });

  it("ignores sold-out sizes when comparing prices", () => {
    const list = [
      product("low-but-sold-out", {
        sizes: [
          { label: "10 مل", price: 50, inStock: false },
          { label: "50 مل", price: 600, inStock: true },
        ],
      }),
      product("mid", {
        sizes: [{ label: "50 مل", price: 500, inStock: true }],
      }),
    ];

    expect(sortProducts(list, "price-asc").map((p) => p.id)).toEqual([
      "mid",
      "low-but-sold-out",
    ]);
  });

  it("sorts price descending", () => {
    const list = [
      product("cheap", { sizes: [{ label: "10 مل", price: 120, inStock: true }] }),
      product("dear", { sizes: [{ label: "100 مل", price: 900, inStock: true }] }),
    ];

    expect(sortProducts(list, "price-desc").map((p) => p.id)).toEqual([
      "dear",
      "cheap",
    ]);
  });

  it("keeps a size-less product at the end in both directions", () => {
    const missing = product("missing", { sizes: [] });
    const cheap = product("cheap");
    const dear = product("dear", {
      sizes: [{ label: "100 مل", price: 900, inStock: true }],
    });

    expect(
      sortProducts([missing, dear, cheap], "price-asc").map((p) => p.id),
    ).toEqual(["cheap", "dear", "missing"]);

    expect(
      sortProducts([missing, cheap, dear], "price-desc").map((p) => p.id),
    ).toEqual(["dear", "cheap", "missing"]);
  });

  it("sorts Arabic names alphabetically", () => {
    const list = [product("ب"), product("أ")];
    expect(sortProducts(list, "alphabetical").map((p) => p.id)).toEqual([
      "أ",
      "ب",
    ]);
  });

  it("does not mutate the input array", () => {
    const list = [product("b"), product("a")];
    const copy = [...list];
    sortProducts(list, "alphabetical");
    expect(list).toEqual(copy);
  });

  it("returns a new array for the default sort", () => {
    const list = [product("a")];
    const sorted = sortProducts(list, "featured");
    expect(sorted).not.toBe(list);
    expect(sorted).toHaveLength(1);
  });
});
