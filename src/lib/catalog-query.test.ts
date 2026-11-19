import { describe, it, expect } from "vitest";
import {
  buildCatalogView,
  buildFacets,
  filterCatalog,
  matchesFacetValue,
} from "./catalog-query";
import { EMPTY_CATALOG_STATE, type CatalogState } from "./catalog-filters";
import type { Product, ProductSize } from "@/types";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function size(label: string, price: number, inStock = true): ProductSize {
  return { label, price, inStock };
}

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
    sizes: [size("10 مل", 120), size("100 مل", 700)],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

const african = product({
  id: "african",
  name: "أفريكان ليذر",
  gender: "للجنسين",
  type: "شرقي",
  house: "نيش",
  season: "شتوي",
});

const amwag = product({
  id: "amwag",
  name: "أمواج",
  gender: "رجالي",
  type: "شرقي",
  house: "ديزاينر",
  season: "صيفي",
  performance: "أداء متوسط",
  featured: true,
  sizes: [size("10 مل", 150), size("50 مل", 500)],
});

const wasm = product({
  id: "wasm",
  name: "الوسام",
  gender: "نسائي",
  type: "غربي",
  house: "دووب",
  season: "صيفي",
  performance: "أداء ضعيف",
  sizes: [size("10 مل", 220), size("50 مل", 500, false)],
});

const soldOut = product({
  id: "sold-out",
  name: "نفد",
  gender: "نسائي",
  type: "شرقي",
  house: "نيش",
  season: "خريفي",
  performance: "أداء صاروخي",
  inStock: false,
  sizes: [size("10 مل", 180, false)],
});

const comingSoon = product({
  id: "coming",
  name: "قادم",
  image: "/products/placeholder-unavailable.webp",
  gender: "رجالي",
  type: "غربي",
  house: "ديزاينر",
  season: "ربيعي",
  inStock: false,
  sizes: [size("10 مل", 120, false)],
});

const cheap = product({
  id: "cheap",
  name: "بسيط",
  gender: "رجالي",
  type: "غربي",
  house: "نيش",
  season: "ربيعي",
  sizes: [size("10 مل", 120)],
});

const oil = product({
  id: "oil",
  name: "زيت عود",
  oily: true,
  concentration: "oil",
  sizes: [size("3 مل", 120), size("6 مل", 200), size("12 مل", 300)],
});

const CATALOGUE = [african, amwag, wasm, soldOut, comingSoon, cheap];

const state = (overrides: Partial<CatalogState> = {}): CatalogState => ({
  ...EMPTY_CATALOG_STATE,
  ...overrides,
});

const ids = (products: Product[]) => products.map((p) => p.id);

// ─── Filtering ──────────────────────────────────────────────────────────────

describe("filterCatalog", () => {
  it("returns everything for an empty state", () => {
    expect(filterCatalog(CATALOGUE, state())).toHaveLength(6);
  });

  it("ORs the values inside the gender group", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ gender: ["رجالي", "نسائي"] })))).toEqual([
      "amwag",
      "wasm",
      "sold-out",
      "coming",
      "cheap",
    ]);
  });

  it("keeps out-of-stock products in the result set (no availability filter)", () => {
    // The removed "المتوفر فقط" toggle means a sold-out product always renders
    // (sorted last, "غير متوفر" on its card) instead of being hideable.
    expect(ids(filterCatalog(CATALOGUE, state()))).toContain("sold-out");
    expect(ids(filterCatalog(CATALOGUE, state()))).toContain("coming");
    expect(ids(filterCatalog(CATALOGUE, state({ gender: ["نسائي"] })))).toEqual([
      "wasm",
      "sold-out",
    ]);
  });

  it("narrows to fodaOriginal products with the foda facet", () => {
    const flagged = [
      ...CATALOGUE,
      product({ id: "foda", name: "فودا", fodaOriginal: true }),
    ];
    expect(ids(filterCatalog(flagged, state({ foda: ["الأصلية"] })))).toEqual(["foda"]);
    expect(filterCatalog(flagged, state())).toHaveLength(CATALOGUE.length + 1);
  });

  it("applies the internal form narrowing for the oils link", () => {
    // `form` never shows as a group, but `?form=زيت عطري` must keep landing
    // on oils — the header's زيوت عطرية link depends on it.
    const withOil = [...CATALOGUE, oil];
    expect(ids(filterCatalog(withOil, state({ form: ["زيت عطري"] })))).toEqual(["oil"]);
    expect(ids(filterCatalog(withOil, state({ form: ["عطر"] })))).toEqual(
      CATALOGUE.map((p) => p.id),
    );
  });

  it("searches with Arabic normalisation", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ q: "افريكان" })))).toEqual(["african"]);
  });

  it("combines search and gender (and the internal form)", () => {
    expect(
      ids(filterCatalog(CATALOGUE, state({ q: "بسيط", gender: ["رجالي"] }))),
    ).toEqual(["cheap"]);
    expect(
      ids(filterCatalog(CATALOGUE, state({ q: "بسيط", form: ["زيت عطري"] }))),
    ).toEqual([]);
  });
});

// ─── Matching ───────────────────────────────────────────────────────────────

describe("matchesFacetValue", () => {
  it("compares gender exactly", () => {
    expect(matchesFacetValue(african, "gender", "للجنسين")).toBe(true);
    expect(matchesFacetValue(african, "gender", "رجالي")).toBe(false);
  });

  it("treats the foda facet as a flag", () => {
    const flagged = product({ id: "foda", fodaOriginal: true });
    expect(matchesFacetValue(flagged, "foda", "الأصلية")).toBe(true);
    expect(matchesFacetValue(african, "foda", "الأصلية")).toBe(false);
  });
});

// ─── Facets ─────────────────────────────────────────────────────────────────

describe("buildFacets", () => {
  it("offers only the gender and foda groups", () => {
    const flagged = [...CATALOGUE, product({ id: "foda", fodaOriginal: true })];
    const keys = buildFacets(flagged, state()).map((group) => group.key);
    expect(keys).toEqual(["gender", "foda"]);
  });

  it("keeps a zero-count option visible so it can be disabled", () => {
    const facets = buildFacets(CATALOGUE, state({ gender: ["رجالي"] }));
    const genders = facets.find((group) => group.key === "gender");
    expect(
      Object.fromEntries(genders!.options.map((option) => [option.value, option.count])),
    ).toEqual({ رجالي: 3, نسائي: 2, للجنسين: 1 });
  });

  it("counts an option against the OTHER filters, not its own group", () => {
    const facets = buildFacets(CATALOGUE, state({ gender: ["رجالي"] }));
    const genders = facets.find((group) => group.key === "gender");

    // Selecting رجالي must not collapse the other gender counts to zero.
    expect(
      Object.fromEntries(genders!.options.map((option) => [option.value, option.count])),
    ).toEqual({ رجالي: 3, نسائي: 2, للجنسين: 1 });
  });

  it("hides the foda group when no visible product carries the flag", () => {
    expect(buildFacets(CATALOGUE, state()).find((group) => group.key === "foda")).toBeUndefined();
    const flagged = [...CATALOGUE, product({ id: "foda", fodaOriginal: true })];
    const foda = buildFacets(flagged, state()).find((group) => group.key === "foda");
    expect(foda?.options).toEqual([{ value: "الأصلية", label: "الأصلية فقط", count: 1 }]);
  });

  it("applies the internal form narrowing to facet counts", () => {
    const facets = buildFacets([...CATALOGUE, oil], state({ form: ["زيت عطري"] }));
    const genders = facets.find((group) => group.key === "gender");
    // Only the oil is in the pool, so every count comes from it.
    expect(
      Object.fromEntries(genders!.options.map((option) => [option.value, option.count])),
    ).toEqual({ رجالي: 0, نسائي: 0, للجنسين: 1 });
  });

  it("keeps a product without a season in the catalogue", () => {
    // The season is optional DATA, so a season-less product must be filtered,
    // sorted and counted exactly like any other — it simply has no facet.
    const seasonless = product({
      id: "no-season",
      name: "بلا فصل",
      season: undefined,
      gender: "رجالي",
    });
    const view = buildCatalogView([seasonless], state());
    expect(view.total).toBe(1);
    expect(view.products[0].id).toBe("no-season");
    expect(ids(filterCatalog([seasonless], state({ gender: ["رجالي"] })))).toEqual([
      "no-season",
    ]);
    expect(matchesFacetValue(seasonless, "gender", "رجالي")).toBe(true);
  });

  it("returns groups in a stable order", () => {
    expect(buildFacets([...CATALOGUE, product({ id: "f", fodaOriginal: true })], state()).map(
      (group) => group.key,
    )).toEqual(["gender", "foda"]);
  });
});

// ─── View ───────────────────────────────────────────────────────────────────

describe("buildCatalogView", () => {
  it("keeps the master order and puts sold-out / coming-soon last", () => {
    const view = buildCatalogView(CATALOGUE, state());
    expect(view.total).toBe(6);
    // The default sort is the owner's catalogue order; featured never ranks.
    expect(view.products[0].id).toBe("african");
    expect(view.products.slice(-2).map((p) => p.id)).toEqual(["sold-out", "coming"]);
  });

  it("keeps the count in step with the filters", () => {
    const view = buildCatalogView(CATALOGUE, state({ gender: ["للجنسين"] }));
    expect(view.total).toBe(1);
    expect(view.catalogueSize).toBe(6);
  });

  it("sorts by price after filtering", () => {
    const view = buildCatalogView(CATALOGUE, state({ sort: "price-asc" }));
    expect(view.products.map((p) => p.id)).toEqual([
      "african",
      "cheap",
      "amwag",
      "wasm",
      "sold-out",
      "coming",
    ]);
  });

  it("sorts alphabetically in Arabic", () => {
    const view = buildCatalogView(CATALOGUE, state({ sort: "alphabetical" }));
    expect(view.products[0].name).toBe("أفريكان ليذر");
  });
});
