import { describe, it, expect } from "vitest";
import type { Product, ProductSize } from "@/types";
import { selectHeroProducts } from "./hero-products";

const size = (label: string, price: number, inStock = true): ProductSize => ({
  label,
  price,
  inStock,
});

/** Product stub; `slug` doubles as the image key. */
function product(overrides: Partial<Product> & { slug: string }): Product {
  return {
    id: overrides.slug,
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
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 0,
    sizes: [size("50 مل", 400)],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

// Real manifest slugs: pf080 is a transparent cut-out, pf070's photo is not.
const CUTOUT_A = "pf080";
const CUTOUT_B = "pf150";
const CUTOUT_C = "pf240";
const CUTOUT_D = "pf290";
const NOT_CUTOUT = "pf590";

const catalogue = [
  product({ slug: CUTOUT_A, featured: true }),
  product({ slug: CUTOUT_B, featured: true }),
  product({ slug: CUTOUT_C, featured: true }),
  product({ slug: CUTOUT_D, featured: true }),
  product({ slug: NOT_CUTOUT, featured: true }),
];

describe("selectHeroProducts", () => {
  it("returns three featured cut-outs, deterministically", () => {
    const first = selectHeroProducts(catalogue);
    expect(first.map((p) => p.slug)).toEqual([CUTOUT_A, CUTOUT_B, CUTOUT_C]);
    expect(selectHeroProducts([...catalogue].reverse())).toEqual(first);
  });

  it("orders by sales counts, then by slug", () => {
    const counted = selectHeroProducts(catalogue, {
      [CUTOUT_D]: 40,
      [CUTOUT_C]: 20,
    });
    expect(counted.map((p) => p.slug)).toEqual([CUTOUT_D, CUTOUT_C, CUTOUT_A]);
  });

  it("ignores a product whose photo is not a transparent cut-out", () => {
    expect(selectHeroProducts(catalogue).map((p) => p.slug)).not.toContain(
      NOT_CUTOUT,
    );
  });

  it("never shows hidden or coming-soon products", () => {
    const hidden = [product({ slug: CUTOUT_A, featured: true, hidden: true })];
    expect(selectHeroProducts(hidden)).toEqual([]);

    const comingSoon = [
      product({
        slug: CUTOUT_A,
        featured: true,
        sizes: [size("50 مل", 400, false)],
      }),
    ];
    expect(selectHeroProducts(comingSoon)).toEqual([]);
  });

  it("uses the owner's list when given, in that order", () => {
    expect(
      selectHeroProducts(catalogue, {}, [CUTOUT_D, CUTOUT_B, CUTOUT_A]).map(
        (p) => p.slug,
      ),
    ).toEqual([CUTOUT_D, CUTOUT_B, CUTOUT_A]);
  });

  it("drops a hidden product from the owner's list", () => {
    const withHidden = catalogue.map((p) =>
      p.slug === CUTOUT_B ? { ...p, hidden: true } : p,
    );
    expect(
      selectHeroProducts(withHidden, {}, [CUTOUT_A, CUTOUT_B]).length,
    ).toBe(1);
  });

  it("fills the trio with the best-selling cut-outs when fewer are featured", () => {
    const oneFeatured = [
      product({ slug: CUTOUT_A, featured: true }),
      product({ slug: CUTOUT_B }),
      product({ slug: CUTOUT_C }),
      product({ slug: CUTOUT_D }),
    ];

    expect(selectHeroProducts(oneFeatured).map((p) => p.slug)).toEqual([
      CUTOUT_A,
      CUTOUT_B,
      CUTOUT_C,
    ]);
    expect(
      selectHeroProducts(oneFeatured, { [CUTOUT_D]: 9, [CUTOUT_C]: 2 }).map(
        (p) => p.slug,
      ),
    ).toEqual([CUTOUT_A, CUTOUT_D, CUTOUT_C]);
  });

  it("keeps a featured bottle first even when a filler sold more", () => {
    const one = [
      product({ slug: CUTOUT_A, featured: true }),
      product({ slug: CUTOUT_B }),
      product({ slug: CUTOUT_C }),
    ];
    expect(
      selectHeroProducts(one, { [CUTOUT_C]: 100, [CUTOUT_B]: 50 }).map(
        (p) => p.slug,
      ),
    ).toEqual([CUTOUT_A, CUTOUT_C, CUTOUT_B]);
  });

  it("shows three even when nothing is featured", () => {
    const none = catalogue
      .slice(0, 3)
      .map((p) => ({ ...p, featured: false }));
    expect(selectHeroProducts(none).map((p) => p.slug)).toEqual([
      CUTOUT_A,
      CUTOUT_B,
      CUTOUT_C,
    ]);
  });

  it("falls back to one centred bottle when fewer than three qualify", () => {
    expect(selectHeroProducts(catalogue.slice(0, 2))).toHaveLength(1);
    expect(selectHeroProducts(catalogue.slice(0, 1))[0].slug).toBe(CUTOUT_A);
    // Two featured and nothing else is still two bottles: one, not two.
    expect(selectHeroProducts(catalogue.slice(0, 2))[0].slug).toBe(CUTOUT_A);
  });

  it("returns nothing when no product can be shown", () => {
    expect(selectHeroProducts([])).toEqual([]);
  });
});
