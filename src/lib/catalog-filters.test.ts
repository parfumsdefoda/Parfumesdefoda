import { describe, it, expect } from "vitest";
import {
  EMPTY_CATALOG_STATE,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  isDefaultCatalogState,
  parseCatalogState,
  removeFacetValue,
  serializeCatalogState,
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
    const state = parseCatalogState({ gender: "رجالي,غير-موجود" });
    expect(state.gender).toEqual(["رجالي"]);
  });

  it("ignores a legacy season parameter completely", () => {
    // `season` is optional catalogue DATA, not a filter: an old shared link
    // such as /shop?season=شتوي must load as if the parameter were absent.
    expect(parseCatalogState({ season: "شتوي" })).toEqual(EMPTY_CATALOG_STATE);
    expect(parseCatalogState({ season: "صيفي,شتوي,خريفي" })).toEqual(EMPTY_CATALOG_STATE);
    expect(parseCatalogState({ season: "شتوي" })).not.toHaveProperty("season");
  });

  it("ignores every removed filter parameter", () => {
    // النوع (style) / الدار (tier) / الأداء (performance) / المقاس (size) /
    // المتوفر فقط (available) are no longer filters. Old links carrying them
    // must load unfiltered by them instead of crashing or narrowing.
    const legacy = parseCatalogState({
      style: "شرقي",
      tier: "نيش",
      performance: "أداء قوي",
      size: "50 مل",
      available: "1",
    });
    expect(legacy).toEqual(EMPTY_CATALOG_STATE);
    expect(legacy).not.toHaveProperty("style");
    expect(legacy).not.toHaveProperty("tier");
    expect(legacy).not.toHaveProperty("performance");
    expect(legacy).not.toHaveProperty("size");
    expect(legacy).not.toHaveProperty("available");
  });

  it("keeps the internal form narrowing for the oils nav link", () => {
    expect(parseCatalogState({ form: "زيت عطري" }).form).toEqual(["زيت عطري"]);
    expect(parseCatalogState({ form: "بخاخ,عطر" }).form).toEqual(["عطر"]);
  });

  it("ignores a non-volume size and an unknown sort", () => {
    const state = parseCatalogState({ size: "كبير", sort: "cheapest" });
    expect(state.sort).toBe("default");
  });

  it("silently ignores a legacy premium sort value", () => {
    const state = parseCatalogState({ sort: "featured" });
    expect(state.sort).toBe("default");
  });

  it("accepts a known sort", () => {
    expect(parseCatalogState({ sort: "price-asc" }).sort).toBe("price-asc");
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
      gender: ["رجالي"],
    };
    expect(serializeCatalogState(state)).toBe(
      new URLSearchParams([
        ["gender", "رجالي"],
        ["sort", "price-desc"],
        ["q", "عود"],
      ]).toString(),
    );
  });

  it("writes the internal form narrowing back so the oils link survives", () => {
    expect(serializeCatalogState({ ...EMPTY_CATALOG_STATE, form: ["زيت عطري"] })).toBe(
      new URLSearchParams([["form", "زيت عطري"]]).toString(),
    );
  });

  it("never writes removed parameters into the URL", () => {
    const legacy = { ...EMPTY_CATALOG_STATE, gender: ["رجالي"] } as CatalogState & {
      style?: string[];
      tier?: string[];
      performance?: string[];
      size?: string[];
      available?: boolean;
      season?: string[];
    };
    legacy.style = ["شرقي"];
    legacy.tier = ["نيش"];
    legacy.performance = ["أداء قوي"];
    legacy.size = ["50 مل"];
    legacy.available = true;
    legacy.season = ["شتوي"];
    expect(serializeCatalogState(legacy)).toBe(`gender=${encodeURIComponent("رجالي")}`);
  });

  it("round-trips through the parser", () => {
    const state: CatalogState = {
      gender: ["نسائي"],
      form: ["زيت عطري"],
      foda: ["الأصلية"],
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

  it("keeps the sort when clearing the filters (and clears the internal form)", () => {
    const state: CatalogState = {
      ...EMPTY_CATALOG_STATE,
      gender: ["رجالي"],
      form: ["زيت عطري"],
      q: "عود",
      sort: "price-asc",
    };
    const cleared = clearCatalogFilters(state);
    expect(cleared.sort).toBe("price-asc");
    expect(cleared.form).toEqual([]);
    expect(isDefaultCatalogState(cleared)).toBe(true);
  });

  it("only counts visible filter values", () => {
    const state: CatalogState = {
      ...EMPTY_CATALOG_STATE,
      gender: ["رجالي", "نسائي"],
      form: ["زيت عطري"],
    };
    // The internal oils narrowing is not a shopper-chosen filter.
    expect(countActiveFilters(state)).toBe(2);
    expect(countActiveFilters({ ...state, q: "عود" })).toBe(2);
    expect(isDefaultCatalogState(state)).toBe(false);
  });

  it("reads and writes the foda facet and counts it", () => {
    expect(parseCatalogState({ foda: "الأصلية" }).foda).toEqual(["الأصلية"]);
    expect(parseCatalogState({ foda: "foda" }).foda).toEqual([]);
    expect(serializeCatalogState({ ...EMPTY_CATALOG_STATE, foda: ["الأصلية"] })).toBe(
      `foda=${encodeURIComponent("الأصلية")}`,
    );
    expect(countActiveFilters({ ...EMPTY_CATALOG_STATE, foda: ["الأصلية"] })).toBe(1);
  });

  it("setters return new objects", () => {
    expect(setSort(EMPTY_CATALOG_STATE, "alphabetical").sort).toBe("alphabetical");
    expect(setQuery(EMPTY_CATALOG_STATE, " عود ").q).toBe("عود");
  });
});

describe("facetValueLabel", () => {
  it("maps internal women enum to the public label", () => {
    expect(facetValueLabel("gender", "نسائي")).toBe("حريمي");
  });

  it("falls back to the catalogue value", () => {
    expect(facetValueLabel("gender", "للجنسين")).toBe("للجنسين");
    expect(facetValueLabel("foda", "الأصلية")).toBe("الأصلية فقط");
  });
});
