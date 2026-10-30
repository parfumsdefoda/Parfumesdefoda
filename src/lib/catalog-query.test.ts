import { describe, it, expect } from "vitest";
import { buildCatalogView, buildFacets, filterCatalog, matchesFacetValue } from "./catalog-query";
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

  it("ORs the values inside one group", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ gender: ["رجالي", "نسائي"] })))).toEqual([
      "amwag",
      "wasm",
      "sold-out",
      "coming",
      "cheap",
    ]);
  });

  it("ANDs across groups", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ gender: ["رجالي"], style: ["غربي"] })))).toEqual([
      "coming",
      "cheap",
    ]);
  });

  it("filters by a bottle size the shopper can actually buy", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ size: ["10 مل"] })))).toEqual([
      "african",
      "amwag",
      "wasm",
      "cheap",
    ]);
    expect(ids(filterCatalog(CATALOGUE, state({ size: ["50 مل"] })))).toEqual(["amwag"]);
    expect(ids(filterCatalog(CATALOGUE, state({ size: ["100 مل"] })))).toEqual(["african"]);
  });

  it("never matches a size that is out of stock", () => {
    const halfSoldOut = product({
      id: "half",
      sizes: [size("10 مل", 50, false), size("50 مل", 600)],
    });
    expect(filterCatalog([halfSoldOut], state({ size: ["10 مل"] }))).toHaveLength(0);
    expect(filterCatalog([halfSoldOut], state({ size: ["50 مل"] }))).toHaveLength(1);
  });

  it("excludes sold-out and photo-pending products with the availability toggle", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ available: true })))).toEqual([
      "african",
      "amwag",
      "wasm",
      "cheap",
    ]);
  });

  it("searches with Arabic normalisation", () => {
    expect(ids(filterCatalog(CATALOGUE, state({ q: "افريكان" })))).toEqual(["african"]);
  });

  it("combines search, filters and availability", () => {
    expect(
      ids(filterCatalog(CATALOGUE, state({ q: "بسيط", gender: ["رجالي"], available: true }))),
    ).toEqual(["cheap"]);
  });
});

// ─── Price matching ─────────────────────────────────────────────────────────

describe("matchesFacetValue", () => {
  it("compares string fields exactly", () => {
    expect(matchesFacetValue(african, "tier", "نيش")).toBe(true);
    expect(matchesFacetValue(african, "tier", "ديزاينر")).toBe(false);
  });

  it("treats the format as a field", () => {
    expect(matchesFacetValue(oil, "form", "زيت عطري")).toBe(true);
    expect(matchesFacetValue(oil, "form", "عطر")).toBe(false);
    expect(matchesFacetValue(african, "form", "عطر")).toBe(true);
  });

  it("matches an oil's 12 مل size only while it is in stock", () => {
    expect(matchesFacetValue(oil, "size", "12 مل")).toBe(true);
    const soldOil = product({
      id: "sold-oil",
      sizes: [size("12 مل", 300, false)],
    });
    expect(matchesFacetValue(soldOil, "size", "12 مل")).toBe(false);
  });
});

// ─── Facets ─────────────────────────────────────────────────────────────────

describe("buildFacets", () => {
  it("never offers دووب as a tier", () => {
    const tier = buildFacets(CATALOGUE, state()).find((g) => g.key === "tier");
    expect(tier?.options.map((option) => option.value)).toEqual(["ديزاينر", "نيش"]);
  });

  it("never offers الفصل as a facet", () => {
    // Season stays optional product DATA (the PDP still shows it), but it is
    // not a catalogue filter any more.
    const keys = buildFacets(CATALOGUE, state()).map((group) => group.key);
    expect(keys).not.toContain("season");
    expect(keys).toEqual(["gender", "style", "tier", "performance", "size"]);
  });

  it("counts an option against the OTHER filters, not its own group", () => {
    const facets = buildFacets(CATALOGUE, state({ gender: ["رجالي"] }));
    const genders = facets.find((group) => group.key === "gender");

    // Selecting رجالي must not collapse the other gender counts to zero.
    expect(
      Object.fromEntries(genders!.options.map((option) => [option.value, option.count])),
    ).toEqual({ رجالي: 3, نسائي: 2, للجنسين: 1 });

    // Tier counts, however, respect the gender filter.
    const tiers = facets.find((group) => group.key === "tier");
    expect(
      Object.fromEntries(tiers!.options.map((option) => [option.value, option.count])),
    ).toEqual({ ديزاينر: 2, نيش: 1 });
  });

  it("keeps a zero-count option visible so it can be disabled", () => {
    const facets = buildFacets(CATALOGUE, state({ style: ["شرقي"] }));
    const styles = facets.find((group) => group.key === "style");
    expect(
      Object.fromEntries(styles!.options.map((option) => [option.value, option.count])),
    ).toEqual({ شرقي: 3, غربي: 3 });
  });

  it("counts each size only where it is buyable", () => {
    const size = buildFacets(CATALOGUE, state()).find((g) => g.key === "size");
    expect(Object.fromEntries(size!.options.map((option) => [option.value, option.count]))).toEqual(
      { "10 مل": 4, "50 مل": 1, "100 مل": 1 },
    );
    // 30 مل is not in this fixture, so the option is not offered at all.
    expect(size!.options.map((option) => option.value)).not.toContain("30 مل");
  });

  it("derives the sizes from the data, smallest first", () => {
    const size = buildFacets([...CATALOGUE, oil], state()).find((g) => g.key === "size");
    expect(size!.options.map((option) => option.value)).toEqual([
      "3 مل",
      "6 مل",
      "10 مل",
      "12 مل",
      "50 مل",
      "100 مل",
    ]);
  });

  it("offers الصيغة only when both formats are sold", () => {
    expect(buildFacets(CATALOGUE, state()).some((group) => group.key === "form")).toBe(false);

    const form = buildFacets([...CATALOGUE, oil], state()).find((group) => group.key === "form");
    expect(form?.options.map((option) => [option.value, option.count])).toEqual([
      ["عطر", 6],
      ["زيت عطري", 1],
    ]);
  });

  it("keeps a product without a season in the catalogue", () => {
    // The season is optional DATA, so a season-less product must be filtered,
    // sorted and counted exactly like any other — it simply never had a facet.
    const seasonless = product({
      id: "no-season",
      name: "بلا فصل",
      season: undefined,
      type: "غربي",
    });
    const view = buildCatalogView([seasonless], state());
    expect(view.total).toBe(1);
    expect(view.products[0].id).toBe("no-season");
    expect(matchesFacetValue(seasonless, "style", "غربي")).toBe(true);
    expect(matchesFacetValue(seasonless, "performance", "أداء قوي")).toBe(true);
  });

  it("returns groups in a stable order", () => {
    expect(buildFacets(CATALOGUE, state()).map((group) => group.key)).toEqual([
      "gender",
      "style",
      "tier",
      "performance",
      "size",
    ]);
  });
});

// ─── View ───────────────────────────────────────────────────────────────────

describe("buildCatalogView", () => {
  it("puts featured first and sold-out / coming-soon last", () => {
    const view = buildCatalogView(CATALOGUE, state());
    expect(view.total).toBe(6);
    expect(view.products[0].id).toBe("amwag");
    expect(view.products.slice(-2).map((p) => p.id)).toEqual(["sold-out", "coming"]);
  });

  it("keeps the count in step with the filters", () => {
    const view = buildCatalogView(CATALOGUE, state({ available: true }));
    expect(view.total).toBe(4);
    expect(view.catalogueSize).toBe(6);
  });

  it("sorts by price after filtering", () => {
    const view = buildCatalogView(CATALOGUE, state({ sort: "price-asc", available: true }));
    expect(view.products.map((p) => p.id)).toEqual(["african", "cheap", "amwag", "wasm"]);
  });

  it("sorts alphabetically in Arabic", () => {
    const view = buildCatalogView(CATALOGUE, state({ sort: "alphabetical", available: true }));
    expect(view.products[0].name).toBe("أفريكان ليذر");
  });
});
