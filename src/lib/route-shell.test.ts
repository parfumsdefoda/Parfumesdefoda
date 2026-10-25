import { describe, expect, it } from "vitest";
import { isCheckoutPath } from "./route-shell";

describe("isCheckoutPath", () => {
  it("is true for the checkout flow", () => {
    expect(isCheckoutPath("/checkout")).toBe(true);
    expect(isCheckoutPath("/checkout/")).toBe(true);
    expect(isCheckoutPath("/checkout/success")).toBe(true);
  });

  it("is false everywhere else", () => {
    expect(isCheckoutPath("/")).toBe(false);
    expect(isCheckoutPath("/shop")).toBe(false);
    expect(isCheckoutPath("/product/pf020")).toBe(false);
    expect(isCheckoutPath("/checkout-notes")).toBe(false);
    expect(isCheckoutPath("")).toBe(false);
  });

  it("ignores a query string", () => {
    expect(isCheckoutPath("/checkout?step=1")).toBe(true);
  });
});
