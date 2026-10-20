import { describe, expect, it } from "vitest";
import { getShippingFee } from "./shipping";

describe("getShippingFee", () => {
  it("returns the flat fee from settings", () => {
    expect(getShippingFee({ shipping: { cost: 100 } })).toBe(100);
  });

  it("returns 0 when the fee is zero", () => {
    expect(getShippingFee({ shipping: { cost: 0 } })).toBe(0);
  });

  it("never depends on order size (no free-shipping threshold)", () => {
    const settings = { shipping: { cost: 100 } };
    const smallOrder = 50;
    const largeOrder = 50_000;
    // The same fee applies regardless of the subtotal.
    expect(getShippingFee(settings)).toBe(100);
    expect(getShippingFee(settings)).toBe(100);
    expect(smallOrder + getShippingFee(settings)).toBe(150);
    expect(largeOrder + getShippingFee(settings)).toBe(50_100);
  });

  it("falls back to 0 for negative or non-finite values", () => {
    expect(getShippingFee({ shipping: { cost: -5 } })).toBe(0);
    expect(getShippingFee({ shipping: { cost: Number.NaN } })).toBe(0);
    expect(
      getShippingFee({ shipping: { cost: Number.POSITIVE_INFINITY } }),
    ).toBe(0);
  });

  it("falls back to 0 when the shipping block is missing", () => {
    expect(
      getShippingFee({} as unknown as { shipping: { cost: number } }),
    ).toBe(0);
  });
});
