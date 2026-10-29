import { describe, it, expect } from "vitest";
import type { Product, ProductSize } from "@/types";
import {
  getSimilarProducts,
  isPurchasable,
  selectRelatedProducts,
} from "./related-products";

const size = (inStock = true): ProductSize => ({
  label: "50 مل",
  price: 400,
  inStock,
});

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    sku: overrides.id,
    slug: overrides.id.toLowerCase(),
    name: overrides.id,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${overrides.id}.png`,
    gender: "رجالي",
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
    sizes: [size()],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

const current = product({ id: "current" });
const ids = (selection: ReturnType<typeof selectRelatedProducts>) =>
  selection.products.map((entry) => entry.id);

describe("selectRelatedProducts", () => {
  it("matches on gender and style only", () => {
    const catalogue = [
      current,
      product({ id: "same" }),
      product({ id: "other-gender", gender: "نسائي" }),
      product({ id: "other-style", type: "غربي" }),
    ];
    expect(ids(selectRelatedProducts(current, catalogue))).toEqual(["same"]);
  });

  it("excludes the product being viewed", () => {
    expect(ids(selectRelatedProducts(current, [current]))).not.toContain("current");
  });

  it("sees a base product and its premium variant as two products", () => {
    const base = product({ id: "pf240", name: "تيروني", featured: true, sortOrder: 1 });
    const variant = product({
      id: "pf241",
      name: "تيروني",
      featured: true,
      sortOrder: 2,
    });

    expect(ids(selectRelatedProducts(base, [base, variant]))).toEqual(["pf241"]);
    expect(ids(selectRelatedProducts(variant, [base, variant]))).toEqual(["pf240"]);
  });

  it("never recommends hidden, sold-out or coming-soon products", () => {
    const catalogue = [
      product({ id: "hidden", hidden: true }),
      product({ id: "sold-out", sizes: [size(false)] }),
      product({ id: "coming", image: "/products/placeholder-unavailable.webp" }),
      product({ id: "real" }),
    ];
    expect(ids(selectRelatedProducts(current, catalogue))).toEqual(["real"]);
  });

  it("orders by tier, then season, then performance closeness before owner order", () => {
    const catalogue = [
      product({ id: "performance", house: "ديزاينر", season: "صيفي", performance: "أداء قوي", sortOrder: 0 }),
      product({ id: "season", house: "ديزاينر", season: "شتوي", performance: "أداء ضعيف", sortOrder: 0 }),
      product({ id: "tier", house: "نيش", season: "صيفي", performance: "أداء ضعيف", sortOrder: 0 }),
      product({ id: "same-all", house: "نيش", season: "شتوي", performance: "أداء قوي", featured: false, sortOrder: 10 }),
      product({ id: "same-all-featured", house: "نيش", season: "شتوي", performance: "أداء قوي", featured: true, sortOrder: 1 }),
    ];
    expect(ids(selectRelatedProducts(current, catalogue))).toEqual([
      "same-all-featured",
      "same-all",
      "tier",
      "season",
    ]);
  });

  it("stops at four", () => {
    const catalogue = Array.from({ length: 7 }, (_, index) =>
      product({ id: `p${index}` }),
    );
    expect(selectRelatedProducts(current, catalogue).products).toHaveLength(4);
  });

  it("returns an empty list when nothing is similar", () => {
    expect(selectRelatedProducts(current, [])).toEqual({
      products: [],
      variant: "related",
    });
  });
});

describe("explicit similar links", () => {
  it("puts the master's links first, in the owner's order", () => {
    const explicitA = product({ id: "explicit-a", gender: "نسائي" });
    const explicitB = product({ id: "explicit-b", type: "غربي" });
    const linked = product({
      id: "linked",
      similarTo: ["explicit-b", "explicit-a"],
    });
    const fallback = product({ id: "fallback" });

    const selection = selectRelatedProducts(linked, [
      linked,
      explicitA,
      explicitB,
      fallback,
    ]);

    expect(ids(selection)).toEqual(["explicit-b", "explicit-a", "fallback"]);
    expect(selection.variant).toBe("related");
  });

  it("treats the link as mutual in either direction", () => {
    const target = product({ id: "target", similarTo: ["source"] });
    const source = product({ id: "source" });

    expect(getSimilarProducts(target, [target, source]).map((p) => p.id)).toEqual([
      "source",
    ]);
    expect(getSimilarProducts(source, [target, source]).map((p) => p.id)).toEqual([
      "target",
    ]);
  });

  it("filters hidden and sold-out links but keeps the fallback", () => {
    const linked = product({
      id: "linked",
      similarTo: ["hidden", "sold-out", "good"],
    });
    const catalogue = [
      linked,
      product({ id: "hidden", hidden: true }),
      product({ id: "sold-out", sizes: [size(false)] }),
      product({ id: "good" }),
    ];

    // Only one product qualifies (< the minimum of two), so the row is not
    // rendered — the selection still returns what it found.
    expect(ids(selectRelatedProducts(linked, catalogue))).toEqual(["good"]);
  });

  it("orders the fallback as alternatives and switches the heading flag", () => {
    const unavailable = product({ id: "gone", sizes: [size(false)] });
    const catalogue = [
      unavailable,
      product({ id: "one" }),
      product({ id: "two" }),
    ];

    const selection = selectRelatedProducts(unavailable, catalogue);
    expect(selection.variant).toBe("alternatives");
    expect(isPurchasable(unavailable)).toBe(false);
    expect(isPurchasable(product({ id: "buyable" }))).toBe(true);
    expect(selection.products).toHaveLength(2);
  });
});
