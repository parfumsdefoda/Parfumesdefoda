import { describe, it, expect } from "vitest";
import { searchProducts } from "./search-helpers";
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