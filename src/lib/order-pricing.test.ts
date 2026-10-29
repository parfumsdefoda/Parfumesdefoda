import { describe, expect, it } from "vitest";
import { resolveOrderItems } from "./order-pricing";
import type { Product } from "@/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "PF001",
    sku: "0001",
    slug: "pf001",
    name: "عطر تجريبي",
    brand: "Parfums De Foda",
    description: "وصف",
    image: "/products/pf001.png",
    gallery: [],
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: true,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [
      { label: "50 مللى", price: 900, inStock: true },
      { label: "30 مللى", price: 600, inStock: false },
    ],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  };
}

const catalog: Product[] = [
  makeProduct(),
  makeProduct({ id: "PF002", name: "عطر تاني", sizes: [{ label: "50 مللى", price: 1200, inStock: true }] }),
  makeProduct({ id: "PF003", name: "منتج مخلص", inStock: false }),
];

describe("resolveOrderItems", () => {
  it("prices lines from the catalog, ignoring client prices", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 2 },
      { productId: "PF002", sizeLabel: "50 مللى", quantity: 1 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.subtotal).toBe(900 * 2 + 1200);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      productId: "PF001",
      sizeLabel: "50 مللى",
      quantity: 2,
      price: 900,
      name: "عطر تجريبي",
    });
  });

  it("merges duplicate lines and sums their quantity", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 2 },
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 3 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(5);
    expect(result.subtotal).toBe(900 * 5);
  });

  it("rejects duplicate lines whose merged quantity exceeds 20", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 15 },
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 10 },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejects an unknown product", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "NOPE", sizeLabel: "50 مللى", quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown size", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF001", sizeLabel: "100 مللى", quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-stock size", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF001", sizeLabel: "30 مللى", quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-stock product", () => {
    const result = resolveOrderItems(catalog, [
      { productId: "PF003", sizeLabel: "50 مللى", quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty cart", () => {
    expect(resolveOrderItems(catalog, []).ok).toBe(false);
  });

  it("rejects a hidden product even though its row and stock are intact", () => {
    // Regression (BUG-001): `on_site=لا` only sets `hidden`, so the server used
    // to price and deliver an order for a product the storefront no longer sells.
    const hidden = makeProduct({ id: "PF670", name: "عنبر عود", hidden: true });
    const result = resolveOrderItems([...catalog, hidden], [
      { productId: "PF670", sizeLabel: "50 مللى", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("لم يعد متوفراً");
  });

  it("rejects a coming-soon product that still has a placeholder photo", () => {
    const comingSoon = makeProduct({
      id: "PF999",
      image: "/products/placeholder-unavailable.webp",
    });
    const result = resolveOrderItems([...catalog, comingSoon], [
      { productId: "PF999", sizeLabel: "50 مللى", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejects a product whose status is not active", () => {
    const archived = makeProduct({ id: "PF777", status: "archived" });
    const result = resolveOrderItems([...catalog, archived], [
      { productId: "PF777", sizeLabel: "50 مللى", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
  });

  it("prices an oil's 12 مل size and a mixed cart on the server", () => {
    const oil = makeProduct({
      id: "PF680",
      slug: "pf680",
      name: "عود الصفا والمروه",
      oily: true,
      concentration: "oil",
      sizes: [
        { label: "12 مل", price: 850, inStock: true },
        { label: "6 مل", price: 500, inStock: true },
        { label: "3 مل", price: 350, inStock: true },
      ],
    });

    const result = resolveOrderItems([...catalog, oil], [
      { productId: "PF680", sizeLabel: "12 مل", quantity: 2 },
      { productId: "PF001", sizeLabel: "50 مللى", quantity: 1 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      productId: "PF680",
      sizeLabel: "12 مل",
      price: 850,
      quantity: 2,
    });
    expect(result.subtotal).toBe(850 * 2 + 900);
  });
});
