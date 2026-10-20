import { describe, it, expect } from "vitest";
import { normalizeArabic, searchProducts } from "./search-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    sku: "1",
    slug: "sajdah",
    name: "عطر سجدة",
    brand: "Parfums De Foda",
    description: "عطر شرقي فاخر",
    image: "/test.webp",
    gallery: ["/test.webp"],
    gender: "رجالي",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 4.5,
    reviews: 12,
    status: "active",
    sortOrder: 1,
    sizes: [{ label: "50ml", price: 600, inStock: true }],
    inStock: true,
    notes: { top: ["عود"], middle: ["عنبر"], base: ["مسك"] },
    seo: { title: "", description: "" },
  },
];

const african: Product = {
  ...mockProducts[0],
  id: "2",
  slug: "african-leather",
  name: "أفريكان ليذر",
  description: "عطر جلدي فاخر",
};

const catalog = [...mockProducts, african];

describe("normalizeArabic", () => {
  it("folds hamza forms to bare alef", () => {
    expect(normalizeArabic("أفريكان")).toBe("افريكان");
    expect(normalizeArabic("إفريكان")).toBe("افريكان");
    expect(normalizeArabic("آفريكان")).toBe("افريكان");
  });

  it("folds taa marbuta to haa and alef maqsura to yaa", () => {
    expect(normalizeArabic("سجدة")).toBe("سجده");
    expect(normalizeArabic("هدى")).toBe("هدي");
  });

  it("strips tatweel and diacritics", () => {
    expect(normalizeArabic("ســـجدة")).toBe("سجده");
    expect(normalizeArabic("سَجْدَةٌ")).toBe("سجده");
  });

  it("lowercases Latin text", () => {
    expect(normalizeArabic("Parfums De Foda")).toBe("parfums de foda");
  });

  it("leaves unrelated text intact", () => {
    expect(normalizeArabic("عود")).toBe("عود");
  });
});

describe("searchProducts — Arabic normalisation", () => {
  it("finds a hamza word typed without the hamza", () => {
    expect(searchProducts(catalog, "افريكان")).toHaveLength(1);
    expect(searchProducts(catalog, "افريكان")[0].name).toBe("أفريكان ليذر");
  });

  it("finds a taa-marbuta word typed with haa", () => {
    expect(searchProducts(catalog, "سجده")).toHaveLength(1);
  });

  it("finds a word typed with tatweel", () => {
    expect(searchProducts(mockProducts, "ســجدة")).toHaveLength(1);
  });

  it("finds a word typed with diacritics", () => {
    expect(searchProducts(mockProducts, "سَجْدَة")).toHaveLength(1);
  });

  it("matches case-insensitively for Latin", () => {
    expect(searchProducts(mockProducts, "PARFUMS")).toHaveLength(1);
  });
});

describe("searchProducts", () => {
  it("returns all products for empty query", () => {
    expect(searchProducts(mockProducts, "")).toHaveLength(1);
  });

  it("matches by name", () => {
    expect(searchProducts(mockProducts, "سجدة")).toHaveLength(1);
  });

  it("matches by brand", () => {
    expect(searchProducts(mockProducts, "Parfums")).toHaveLength(1);
  });

  it("matches by house", () => {
    expect(searchProducts(mockProducts, "نيش")).toHaveLength(1);
  });

  it("matches by gender", () => {
    expect(searchProducts(mockProducts, "رجالي")).toHaveLength(1);
  });

  it("matches by fragrance note", () => {
    expect(searchProducts(mockProducts, "عود")).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(searchProducts(mockProducts, "xyz")).toHaveLength(0);
  });
});