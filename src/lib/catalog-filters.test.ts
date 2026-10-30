import { describe, it, expect } from "vitest";
import {
  EMPTY_CATALOG_STATE,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  isDefaultCatalogState,
  isSizeFilterValue,
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
      performance: "أداء قوي,أداء خرافي",
    });
    expect(state.gender).toEqual(["رجالي"]);
    expect(state.performance).toEqual(["أداء قوي"]);
  });

  it("ignores a legacy season parameter completely", () => {
    // `season` is optional catalogue DATA, not a filter: an old shared link
    // such as /shop?season=شتوي must load as if the parameter were absent.
    expect(parseCatalogState({ season: "شتوي" })).toEqual(EMPTY_CATALOG_STATE);
    expect(parseCatalogState({ season: "صيفي,شتوي,خريفي" })).toEqual(EMPTY_CATALOG_STATE);
    expect(parseCatalogState({ season: "شتوي" })).not.toHaveProperty("season");
  });

  it("never accepts دووب as a tier filter", () => {
    expect(parseCatalogState({ tier: "دووب" }).tier).toEqual([]);
    expect(parseCatalogState({ tier: "نيش,دووب" }).tier).toEqual(["نيش"]);
  });

  it("ignores a non-volume size and an unknown sort", () => {
    const state = parseCatalogState({ size: "كبير", sort: "cheapest" });
    expect(state.size).toEqual([]);
    expect(state.sort).toBe("featured");
  });

  it("reads any volume label the data can carry, oil sizes included", () => {
    expect(parseCatalogState({ size: "100 مل,50 مل,30 مل,12 مل,10 مل,6 مل,3 مل" }).size).toEqual([
      "100 مل",
      "50 مل",
      "30 مل",
      "12 مل",
      "10 مل",
      "6 مل",
      "3 مل",
    ]);
  });

  it("reads the الصيغة group and drops an unknown value", () => {
    expect(parseCatalogState({ form: "عطر" }).form).toEqual(["عطر"]);
    expect(parseCatalogState({ form: "بخاخ,زيت عطري" }).form).toEqual(["زيت عطري"]);
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
    expect(parseCatalogState({ gender: ["نسائي", "رجالي"] }).gender).toEqual(["نسائي"]);
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
      performance: ["أداء قوي"],
      gender: ["رجالي"],
    };
    const withSize = new URLSearchParams(serializeCatalogState({ ...state, size: ["30 مل"] }));
    expect(withSize.get("size")).toBe("30 مل");
    expect(serializeCatalogState(state)).toBe(
      new URLSearchParams([
        ["gender", "رجالي"],
        ["performance", "أداء قوي"],
        ["sort", "price-desc"],
        ["q", "عود"],
      ]).toString(),
    );
  });

  it("never writes a legacy season into the URL", () => {
    const legacy = { ...EMPTY_CATALOG_STATE, gender: ["رجالي"] } as CatalogState & {
      season?: string[];
    };
    legacy.season = ["شتوي"];
    expect(serializeCatalogState(legacy)).toBe(`gender=${encodeURIComponent("رجالي")}`);
  });

  it("round-trips through the parser", () => {
    const state: CatalogState = {
      gender: ["نسائي"],
      style: ["شرقي"],
      form: ["زيت عطري"],
      tier: ["نيش"],
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
    expect(removeFacetValue(state, "gender", "رجالي").gender).toEqual(["نسائي"]);
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
    expect(setSort(EMPTY_CATALOG_STATE, "alphabetical").sort).toBe("alphabetical");
    expect(setQuery(EMPTY_CATALOG_STATE, " عود ").q).toBe("عود");
    expect(setAvailable(EMPTY_CATALOG_STATE, true).available).toBe(true);
  });
});

describe("size group", () => {
  it("accepts every volume label, including oil sizes", () => {
    expect(isSizeFilterValue("12 مل")).toBe(true);
    expect(isSizeFilterValue("3 مل")).toBe(true);
    expect(isSizeFilterValue("100 مل")).toBe(true);
    expect(isSizeFilterValue("كبير")).toBe(false);
    expect(isSizeFilterValue("مل")).toBe(false);
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
    expect(facetValueLabel("form", "زيت عطري")).toBe("زيت عطري");
  });
});
