import { describe, it, expect } from "vitest";
import {
  EMPTY_CATALOG_STATE,
  SIZE_FILTER_VALUES,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  isDefaultCatalogState,
  parseCatalogState,
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

  it("ignores an unknown size and sort", () => {
    const state = parseCatalogState({ size: "250 مل", sort: "cheapest" });
    expect(state.size).toEqual([]);
    expect(state.sort).toBe("featured");
  });

  it("reads the four real bottle sizes", () => {
    const value = SIZE_FILTER_VALUES.join(",");
    expect(parseCatalogState({ size: value }).size).toEqual([
      ...SIZE_FILTER_VALUES,
    ]);
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
    const withSize = new URLSearchParams(
      serializeCatalogState({ ...state, size: ["30 مل"] }),
    );
    expect(withSize.get("size")).toBe("30 مل");
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
      size: ["100 مل"],
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

describe("size group", () => {
  it("offers exactly the four catalogue sizes, in order", () => {
    expect(SIZE_FILTER_VALUES).toEqual(["10 مل", "30 مل", "50 مل", "100 مل"]);
  });
});

describe("facetValueLabel", () => {
  it("shows a size with Arabic-Indic digits", () => {
    expect(facetValueLabel("size", "50 مل")).toBe("٥٠ مل");
  });

  it("labels a tier through the public lookup", () => {
    expect(facetValueLabel("tier", "نيش")).toBe("نيش");
  });

  it("maps internal women enum to the public label", () => {
    expect(facetValueLabel("gender", "نسائي")).toBe("حريمي");
  });

  it("falls back to the catalogue value", () => {
    expect(facetValueLabel("gender", "للجنسين")).toBe("للجنسين");
  });
});
