import { describe, it, expect } from "vitest";
import { filterProducts, toggleFilter, countActiveFilters } from "./filter-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    sku: "1",
    slug: "product-1",
    name: "Test Product 1",
    brand: "Test Brand",
    description: "Test description",
    image: "/test.webp",
    gallery: ["/test.webp"],
    gender: "رجالي",
    type: "شرقي",
    house: "ديزاينر",
    oily: false,
    fodaOriginal: false,
    season: "صيفي",
    performance: "أداء ضعيف",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [{ label: "50ml", price: 100, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
  },
  {
    id: "2",
    sku: "2",
    slug: "product-2",
    name: "Test Product 2",
    brand: "Test Brand",
    description: "Test description",
    image: "/test2.webp",
    gallery: ["/test2.webp"],
    gender: "نسائي",
    type: "غربي",
    house: "نيش",
    oily: true,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء صاروخي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 2,
    sizes: [{ label: "30ml", price: 200, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
  },
];

describe("filterProducts", () => {
  it("returns all products when no filters active", () => {
    expect(filterProducts(mockProducts, {})).toHaveLength(2);
  });

  it("filters by gender", () => {
    const result = filterProducts(mockProducts, { الجنس: ["رجالي"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by multiple groups (AND logic)", () => {
    const result = filterProducts(mockProducts, {
      الجنس: ["رجالي"],
      النوع: ["شرقي"],
    });
    expect(result).toHaveLength(1);
  });

  it("filters by type", () => {
    const result = filterProducts(mockProducts, { النوع: ["غربي"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by house (الدار)", () => {
    const result = filterProducts(mockProducts, { الدار: ["نيش"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by oily group (boolean checkbox)", () => {
    const result = filterProducts(mockProducts, {
      "عطور زيتية": ["العود والأدهان"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by featured group (boolean checkbox)", () => {
    const featuredProducts = mockProducts.map((p) => ({
      ...p,
      featured: p.id === "1",
    }));
    const result = filterProducts(featuredProducts, {
      "فاخر": ["فاخر"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("ignores the removed season group entirely (no longer a filter)", () => {
    // The season filter was removed from the sidebar, so an active "الفصل"
    // entry (e.g. from a stale shared URL) must not filter anything out.
    const result = filterProducts(mockProducts, { الفصل: ["صيفي"] });
    expect(result).toHaveLength(mockProducts.length);
  });

  it("filters by performance", () => {
    const result = filterProducts(mockProducts, { الأداء: ["أداء قوي"] });
    expect(result).toHaveLength(0);
  });

  it("ignores unknown groups", () => {
    const result = filterProducts(mockProducts, { "غير معروف": ["x"] });
    expect(result).toHaveLength(2);
  });
});

describe("toggleFilter", () => {
  it("adds filter when not active", () => {
    const result = toggleFilter({}, "group", "slug");
    expect(result.group).toEqual(["slug"]);
  });

  it("removes filter when active", () => {
    const result = toggleFilter({ group: ["slug"] }, "group", "slug");
    expect(result.group).toEqual([]);
  });
});

describe("countActiveFilters", () => {
  it("counts all active filters", () => {
    expect(countActiveFilters({ a: ["1", "2"], b: ["3"] })).toBe(3);
  });

  it("returns 0 for empty filters", () => {
    expect(countActiveFilters({})).toBe(0);
  });
});
