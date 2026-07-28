import { describe, it, expect } from "vitest";
import { filterProducts, toggleFilter, countActiveFilters } from "./filter-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "product-1",
    name: "Test Product 1",
    brand: "Test Brand",
    description: "Test description",
    gender: "رجالي",
    categories: ["رجالي", "شرقي"],
    type: "normal",
    image: "/test.webp",
    sizes: [{ label: "50ml", price: 100 }],
    stock: 10,
    badge: "new",
  },
  {
    id: "2",
    slug: "product-2",
    name: "Test Product 2",
    brand: "Test Brand",
    description: "Test description",
    gender: "حريمي",
    categories: ["حريمي", "غربي"],
    type: "niche",
    image: "/test2.webp",
    sizes: [{ label: "30ml", price: 200 }],
    stock: 5,
    badge: "best-seller",
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
