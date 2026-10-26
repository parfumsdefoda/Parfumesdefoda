import { describe, it, expect } from "vitest";
import type { Product, ProductSize } from "@/types";
import { buildProductJsonLd, buildProductOffer } from "./product-jsonld";

const size = (label: string, price: number, inStock = true): ProductSize => ({
  label,
  price,
  inStock,
});

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "PF090",
    sku: "PF090",
    slug: "pf090",
    name: "أمواج انترلود",
    brand: "Parfums De Foda",
    description: "عطر شرقي خشبي.",
    image: "/products/PF090.png",
    gallery: ["/products/PF090.png", "/products/PF091.png"],
    gender: "رجالي",
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
    sortOrder: 0,
    sizes: [
      size("10 مل", 120),
      size("30 مل", 350, false),
      size("50 مل", 500),
      size("100 مل", 700),
    ],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

const SITE = "https://parfumsdefoda.com";

describe("buildProductOffer", () => {
  it("takes its range from the in-stock sizes only", () => {
    expect(buildProductOffer(product())).toEqual({
      priceCurrency: "EGP",
      lowPrice: 120,
      highPrice: 700,
      offerCount: 3,
      availability: "https://schema.org/InStock",
    });
  });

  it("has no offer when every size is sold out", () => {
    const soldOut = product({ sizes: [size("50 مل", 400, false)] });
    expect(buildProductOffer(soldOut)).toBeUndefined();
  });
});

describe("buildProductJsonLd", () => {
  const jsonLd = buildProductJsonLd(product(), SITE);

  it("uses absolute derived image URLs", () => {
    expect(jsonLd.image.length).toBeGreaterThan(0);
    for (const image of jsonLd.image) {
      expect(image.startsWith(`${SITE}/products/derived/`)).toBe(true);
    }
  });

  it("points at the product's own canonical URL", () => {
    expect(jsonLd.url).toBe(`${SITE}/product/pf090`);
  });

  it("carries the real description and sku", () => {
    expect(jsonLd.description).toBe("عطر شرقي خشبي.");
    expect(jsonLd.sku).toBe("PF090");
  });

  it("never invents ratings or reviews", () => {
    expect(jsonLd).not.toHaveProperty("aggregateRating");
    expect(JSON.stringify(jsonLd)).not.toContain("review");
  });

  it("serialises to valid JSON", () => {
    expect(() => JSON.parse(JSON.stringify(jsonLd))).not.toThrow();
  });

  it("omits offers for a product nobody can buy", () => {
    const coming = buildProductJsonLd(
      product({ sizes: [size("50 مل", 0, false)] }),
      SITE,
    );
    expect(coming.offers).toBeUndefined();
  });
});
