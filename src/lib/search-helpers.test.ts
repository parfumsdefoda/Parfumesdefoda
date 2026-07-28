import { describe, it, expect } from "vitest";
import { searchProducts } from "./search-helpers";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "sajdah",
    name: "عطر سجدة",
    brand: "Parfums De Foda",
    description: "عطر شرقي فاخر",
    gender: "رجالي",
    categories: ["رجالي", "شرقي"],
    type: "gold",
    image: "/test.webp",
    sizes: [{ label: "50ml", price: 600 }],
    stock: 10,
    tags: ["عود", "عنبر"],
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

  it("matches by tag", () => {
    expect(searchProducts(mockProducts, "عود")).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(searchProducts(mockProducts, "xyz")).toHaveLength(0);
  });
});
