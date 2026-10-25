import { describe, expect, it } from "vitest";
import {
  CATEGORY_ROUTES,
  buildPrimaryNav,
  categoryBySlug,
  categoryHref,
  genderCounts,
} from "./site-nav";

const labels = {
  shop: "المتجر",
  men: "رجالي",
  women: "حريمي",
  unisex: "للجنسين",
};

describe("categoryBySlug", () => {
  it("maps every declared slug to its gender value", () => {
    expect(categoryBySlug("men")?.gender).toBe("رجالي");
    expect(categoryBySlug("women")?.gender).toBe("نسائي");
    expect(categoryBySlug("unisex")?.gender).toBe("للجنسين");
  });

  it("returns undefined for anything else", () => {
    expect(categoryBySlug("kids")).toBeUndefined();
    expect(categoryBySlug("")).toBeUndefined();
  });

  it("keeps slug and gender distinct — the URL is Latin, the data is Arabic", () => {
    for (const route of CATEGORY_ROUTES) {
      expect(route.slug).not.toBe(route.gender);
      expect(route.gender).toMatch(/[\u0600-\u06FF]/);
    }
  });
});

describe("categoryHref", () => {
  it("builds the category path", () => {
    expect(categoryHref("women")).toBe("/shop/women");
  });
});

describe("genderCounts", () => {
  it("counts visible products per gender and ignores gaps", () => {
    const counts = genderCounts([
      { gender: "رجالي" },
      { gender: "رجالي" },
      { gender: "للجنسين" },
    ]);
    expect(counts).toEqual({ رجالي: 2, للجنسين: 1 });
    expect(counts["نسائي"]).toBeUndefined();
  });
});

describe("buildPrimaryNav", () => {
  it("always starts with the shop link", () => {
    const nav = buildPrimaryNav({}, labels);
    expect(nav).toEqual([{ label: "المتجر", href: "/shop" }]);
  });

  it("drops a category that would show nothing", () => {
    const nav = buildPrimaryNav({ رجالي: 12, للجنسين: 3 }, labels);
    expect(nav.map((link) => link.href)).toEqual([
      "/shop",
      "/shop/men",
      "/shop/unisex",
    ]);
  });

  it("keeps all three when every gender has products", () => {
    const nav = buildPrimaryNav(
      { رجالي: 12, نسائي: 1, للجنسين: 4 },
      labels,
    );
    expect(nav).toHaveLength(4);
    expect(nav[2]).toEqual({ label: "حريمي", href: "/shop/women" });
  });
});
