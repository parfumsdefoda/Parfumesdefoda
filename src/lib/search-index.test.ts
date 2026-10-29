import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { buildSearchIndex } from "./search-index";

function product(overrides: Partial<Product> & { slug: string }): Product {
  return {
    id: overrides.slug.toUpperCase(),
    sku: overrides.slug.toUpperCase(),
    name: overrides.slug,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${overrides.slug.toUpperCase()}.png`,
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [{ label: "50 مل", price: 500, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

describe("buildSearchIndex", () => {
  it("keeps only what the combobox needs", () => {
    const [item] = buildSearchIndex([
      product({ slug: "pf020", name: "أفريكان ليذر", type: "شرقي", house: "نيش" }),
    ]);
    expect(item).toEqual({
      slug: "pf020",
      name: "أفريكان ليذر",
      meta: "نيش · شرقي",
    });
    expect(Object.keys(item)).toEqual(["slug", "name", "meta"]);
  });

  it("never exposes hidden products", () => {
    expect(
      buildSearchIndex([
        product({ slug: "pf001", hidden: true }),
        product({ slug: "pf002" }),
      ]).map((item) => item.slug),
    ).toEqual(["pf002"]);
  });

  it("never prints the internal دووب tier", () => {
    const [item] = buildSearchIndex([product({ slug: "pf003", house: "دووب" })]);
    expect(item.meta).toBe("شرقي");
    expect(JSON.stringify(item)).not.toContain("دووب");
  });
});
