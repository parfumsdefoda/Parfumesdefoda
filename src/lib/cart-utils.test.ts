import { describe, expect, it } from "vitest";
import { clampCartQuantity, getCartTotals, isCartCheckoutBlocked, resolveCartLines, resolveCartLine, type CartCatalogProduct, type CartLineRecord } from "./cart-utils";

const catalog: CartCatalogProduct[] = [{
  id: "PF001", slug: "pf001", name: "تجريبي", image: "/products/pf001.png", status: "active", inStock: true,
  sizes: [{ label: "50 مل", price: 500, inStock: true }, { label: "30 مل", price: 300, inStock: false }],
}];
const line: CartLineRecord = { productId: "PF001", slug: "pf001", name: "تجريبي", image: "/products/pf001.png", sizeLabel: "50 مل", price: 500, quantity: 2 };

describe("cart resolution", () => {
  it("accepts an unchanged visible product and size", () => {
    expect(resolveCartLine(line, catalog).issue).toBeNull();
  });
  it("detects missing/hidden product, removed or sold-out size, changed price, and invalid quantity", () => {
    expect(resolveCartLine(line, []).issue).toBe("product-unavailable");
    expect(resolveCartLine(line, [{ ...catalog[0], hidden: true }]).issue).toBe("product-unavailable");
    expect(resolveCartLine({ ...line, sizeLabel: "100 مل" }, catalog).issue).toBe("size-unavailable");
    expect(resolveCartLine({ ...line, sizeLabel: "30 مل", price: 300 }, catalog).issue).toBe("size-unavailable");
    expect(resolveCartLine({ ...line, price: 450 }, catalog).issue).toBe("price-changed");
    expect(resolveCartLine({ ...line, quantity: 21 }, catalog).issue).toBe("invalid-quantity");
  });
  it("blocks checkout for any unresolved line", () => {
    expect(isCartCheckoutBlocked(resolveCartLines([{ ...line, price: 1 }], catalog))).toBe(true);
    expect(isCartCheckoutBlocked(resolveCartLines([line], catalog))).toBe(false);
  });
});

describe("cart totals and stepper bounds", () => {
  it("calculates subtotal plus flat shipping from resolved prices", () => {
    const totals = getCartTotals(resolveCartLines([line], catalog), 100);
    expect(totals).toEqual({ subtotal: 1000, shipping: 100, total: 1100 });
  });
  it("clamps the stepper to 1–20", () => {
    expect(clampCartQuantity(-1)).toBe(1);
    expect(clampCartQuantity(1.8)).toBe(1);
    expect(clampCartQuantity(100)).toBe(20);
    expect(clampCartQuantity(Number.NaN)).toBe(1);
  });
});
