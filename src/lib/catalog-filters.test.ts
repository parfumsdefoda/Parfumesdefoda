import { describe, it, expect } from "vitest";
import {
  EMPTY_CATALOG_STATE,
  PRICE_BUCKETS,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  isDefaultCatalogState,
  parseCatalogState,
  priceInBucket,
  removeFacetValue,
  serializeCatalogState,
  setAvailable,
  setQuery,
  setSort,
  toggleFacetValue,
  type CatalogState,
} from "./catalog-filters";

describe("parseCatalogState", () => {
  it("returns the defaults for an empty query string", () => {
    expect(parseCatalogState({})).toEqual(EMPTY_CATALOG_STATE);
  });

  it("reads multi-value groups and collapses duplicates", () => {
    const state = parseCatalogState({ gender: "رجالي,نسائي,رجالي" });
    expect(state.gender).toEqual(["رجالي", "نسائي"]);
  });

  it("ignores a value the catalogue does not know", () => {
    const state = parseCatalogState({
      gender: "رجالي,غير-موجود",
      season: "صيفي,الخريف",
    });
    expect(state.gender).toEqual(["رجالي"]);
    expect(state.season).toEqual(["صيفي"]);
  });

  it("never accepts دووب as a tier filter", () => {
    expect(parseCatalogState({ tier: "دووب" }).tier).toEqual([]);
    expect(parseCatalogState({ tier: "نيش,دووب" }).tier).toEqual(["نيش"]);
  });

  it("ignores an unknown price band and sort", () => {
    const state = parseCatalogState({ price: "bogus", sort: "cheapest" });
    expect(state.price).toEqual([]);
    expect(state.sort).toBe("featured");
  });

  it("accepts a known sort", () => {
    expect(parseCatalogState({ sort: "price-asc" }).sort).toBe("price-asc");
  });

  it("only treats available=1 as the availability toggle", () => {
    expect(parseCatalogState({ available: "1" }).available).toBe(true);
    expect(parseCatalogState({ available: "0" }).available).toBe(false);
    expect(parseCatalogState({ available: "نعم" }).available).toBe(false);
  });

  it("trims and caps the search query", () => {
    const long = "ا".repeat(200);
    expect(parseCatalogState({ q: "  عود  " }).q).toBe("عود");
    expect(parseCatalogState({ q: long }).q.length).toBe(80);
  });

  it("reads the first value of a repeated parameter", () => {
    expect(parseCatalogState({ gender: ["نسائي", "رجالي"] }).gender).toEqual([
      "نسائي",
    ]);
  });
});

describe("serializeCatalogState", () => {
  it("writes the default state as an empty string", () => {
    expect(serializeCatalogState(EMPTY_CATALOG_STATE)).toBe("");
  });

  it("keeps a fixed key order regardless of insertion order", () => {
    const state: CatalogState = {
      ...EMPTY_CATALOG_STATE,
      q: "عود",
      sort: "price-desc",
      season: ["شتوي"],
      gender: ["رجالي"],
    };
    expect(serializeCatalogState(state)).toBe(
      `gender=${encodeURIComponent("رجالي")}&season=${encodeURIComponent("شتوي")}&sort=price-desc&q=${encodeURIComponent("عود")}`,
    );
  });

  it("round-trips through the parser", () => {
    const state: CatalogState = {
      gender: ["نسائي"],
      style: ["شرقي"],
      tier: ["نيش"],
      season: ["صيفي"],
      performance: ["أداء قوي"],
      price: ["up-to-120"],
      available: true,
      sort: "alphabetical",
      q: "أفريكان",
    };
    const query = serializeCatalogState(state);
    const params = Object.fromEntries(new URLSearchParams(query));
    expect(parseCatalogState(params)).toEqual(state);
  });
});

describe("transitions", () => {
  it("toggles a value on and off", () => {
    const on = toggleFacetValue(EMPTY_CATALOG_STATE, "gender", "رجالي");
    expect(on.gender).toEqual(["رجالي"]);
    expect(toggleFacetValue(on, "gender", "رجالي").gender).toEqual([]);
  });

  it("removes only the requested value", () => {
    const state = { ...EMPTY_CATALOG_STATE, gender: ["رجالي", "نسائي"] };
    expect(removeFacetValue(state, "gender", "رجالي").gender).toEqual([
      "نسائي",
    ]);
  });

  it("keeps the sort when clearing the filters", () => {
    const state: CatalogState = {
      ...EMPTY_CATALOG_STATE,
      gender: ["رجالي"],
      q: "عود",
      available: true,
      sort: "price-asc",
    };
    const cleared = clearCatalogFilters(state);
    expect(cleared.sort).toBe("price-asc");
    expect(isDefaultCatalogState(cleared)).toBe(true);
  });

  it("counts filter values plus the availability toggle", () => {
    const state: CatalogState = {
      ...EMPTY_CATALOG_STATE,
      gender: ["رجالي", "نسائي"],
      available: true,
    };
    expect(countActiveFilters(state)).toBe(3);
    expect(countActiveFilters({ ...state, q: "عود" })).toBe(3);
    expect(isDefaultCatalogState({ ...state, q: "عود" })).toBe(false);
  });

  it("setters return new objects", () => {
    expect(setSort(EMPTY_CATALOG_STATE, "alphabetical").sort).toBe(
      "alphabetical",
    );
    expect(setQuery(EMPTY_CATALOG_STATE, " عود ").q).toBe("عود");
    expect(setAvailable(EMPTY_CATALOG_STATE, true).available).toBe(true);
  });
});

describe("price bands", () => {
  it("derives its boundaries from the catalogue's real entry prices", () => {
    expect(PRICE_BUCKETS.map((bucket) => bucket.id)).toEqual([
      "up-to-120",
      "121-to-150",
      "over-150",
    ]);
  });

  it("includes the bounds", () => {
    expect(priceInBucket(120, "up-to-120")).toBe(true);
    expect(priceInBucket(121, "up-to-120")).toBe(false);
    expect(priceInBucket(150, "121-to-150")).toBe(true);
    expect(priceInBucket(151, "121-to-150")).toBe(false);
    expect(priceInBucket(151, "over-150")).toBe(true);
  });

  it("never matches a product without a price", () => {
    expect(priceInBucket(null, "over-150")).toBe(false);
  });
});

describe("facetValueLabel", () => {
  it("labels a price band", () => {
    expect(facetValueLabel("price", "over-150")).toBe("أكثر من ١٥٠ ج.م");
  });

  it("labels a tier through the public lookup", () => {
    expect(facetValueLabel("tier", "نيش")).toBe("نيش");
  });

  it("falls back to the catalogue value", () => {
    expect(facetValueLabel("gender", "للجنسين")).toBe("للجنسين");
  });
});
