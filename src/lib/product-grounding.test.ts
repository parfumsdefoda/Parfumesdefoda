import { describe, it, expect } from "vitest";
import { validateProductCodes, buildProductContext } from "./product-grounding";
import type { Product } from "@/schemas/product-schema";

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockProducts: Product[] = [
  {
    id: "PF010",
    sku: "PF010",
    slug: "pf010",
    name: "أفريكان ليذر",
    brand: "Parfums De Foda",
    description: "عطر جلدي شرقي للجنسين",
    image: "/products/PF010.png",
    gallery: ["/products/PF010.png"],
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [
      { label: "50 مل", price: 500, inStock: true },
      { label: "30 مل", price: 350, inStock: true },
    ],
    inStock: true,
    notes: { top: ["هيل"], middle: ["باتشولي"], base: ["جلود"] },
    seo: { title: "أفريكان ليذر", description: "" },
  },
  {
    id: "PF020",
    sku: "PF020",
    slug: "pf020",
    name: "أكوا دي جيو",
    brand: "Parfums De Foda",
    description: "عطر أروماتك مائي رجالي",
    image: "/products/PF020.png",
    gallery: ["/products/PF020.png"],
    gender: "رجالي",
    type: "غربي",
    house: "ديزاينر",
    oily: false,
    fodaOriginal: false,
    season: "صيفي",
    performance: "أداء متوسط",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 2,
    sizes: [{ label: "50 مل", price: 400, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "أكوا دي جيو", description: "" },
  },
];

// ─── validateProductCodes ───────────────────────────────────────────────────

describe("validateProductCodes", () => {
  const validIds = new Set(mockProducts.map((p) => p.id));

  it("returns only valid codes from a list of real and fake codes", () => {
    const input = ["PF010", "PF999", "PF020", "FAKE_CODE", "PF010"];
    const result = validateProductCodes(input, validIds);
    expect(result).toEqual(["PF010", "PF020", "PF010"]);
  });

  it("returns empty array when all codes are hallucinated", () => {
    const input = ["PF999", "HALLUCINATED", "NOT_A_PRODUCT"];
    const result = validateProductCodes(input, validIds);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    const result = validateProductCodes([], validIds);
    expect(result).toEqual([]);
  });

  it("handles case-sensitive matching (codes are case-sensitive)", () => {
    const input = ["pf010", "PF010"];
    const result = validateProductCodes(input, validIds);
    // "pf010" should NOT match (lowercase), "PF010" should match
    expect(result).toEqual(["PF010"]);
  });

  it("does not allow empty strings", () => {
    const input = ["", "  ", "PF010"];
    const result = validateProductCodes(input, validIds);
    expect(result).toEqual(["PF010"]);
  });

  it("never lets a hallucinated code through — critical security test", () => {
    // Simulate what happens if the AI hallucinates codes
    const hallucinatedCodes = [
      "PF001",
      "PF002",
      "PF003",
      "PF100",
      "PF200",
      "PF999",
      "PERFUME_001",
      "ADMIN",
      "'; DROP TABLE products; --",
    ];
    const result = validateProductCodes(hallucinatedCodes, validIds);
    expect(result).toEqual([]);
    // Ensure no code from the hallucinated list leaked through
    for (const code of result) {
      expect(validIds.has(code)).toBe(true);
    }
  });
});

// ─── buildProductContext ────────────────────────────────────────────────────

describe("buildProductContext", () => {
  it("builds a compact string for each active product", () => {
    const context = buildProductContext(mockProducts);
    expect(context).toContain("كود: PF010");
    expect(context).toContain("اسم: أفريكان ليذر");
    expect(context).toContain("كود: PF020");
    expect(context).toContain("اسم: أكوا دي جيو");
  });

  it("includes key recommendation fields", () => {
    const context = buildProductContext(mockProducts);
    expect(context).toContain("نوع: شرقي");
    expect(context).toContain("نوع: غربي");
    expect(context).toContain("الفصل: شتوي");
    expect(context).toContain("الفصل: صيفي");
    expect(context).toContain("جنس: للجنسين");
    expect(context).toContain("جنس: رجالي");
  });

  it("includes notes when available", () => {
    const context = buildProductContext(mockProducts);
    expect(context).toContain("الروائح:");
    expect(context).toContain("هيل");
    expect(context).toContain("باتشولي");
    expect(context).toContain("جلود");
  });

  it("includes price range", () => {
    const context = buildProductContext(mockProducts);
    expect(context).toContain("350-500");
    expect(context).toContain("400-400");
  });

  it("skips inactive products", () => {
    const inactiveProduct: Product = {
      ...mockProducts[0],
      id: "PF_INACTIVE",
      status: "inactive",
    };
    const context = buildProductContext([inactiveProduct]);
    expect(context).not.toContain("PF_INACTIVE");
  });

  it("produces a non-empty string for non-empty input", () => {
    const context = buildProductContext(mockProducts);
    expect(context.length).toBeGreaterThan(0);
  });
});
