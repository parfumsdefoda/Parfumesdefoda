import { describe, expect, it } from "vitest";
import { isAdvisorLauncherVisible, isCheckoutPath } from "./route-shell";

describe("isCheckoutPath", () => {
  it("matches the checkout flow only", () => {
    expect(isCheckoutPath("/checkout")).toBe(true);
    expect(isCheckoutPath("/checkout/success")).toBe(true);
    expect(isCheckoutPath("/checkout/")).toBe(true);
    expect(isCheckoutPath("/cart")).toBe(false);
    expect(isCheckoutPath("/")).toBe(false);
  });
});

describe("isAdvisorLauncherVisible", () => {
  it("shows on the storefront, catalogue and product pages", () => {
    for (const path of ["/", "/shop", "/shop/men", "/product/pf680", "/faq"]) {
      expect(isAdvisorLauncherVisible(path)).toBe(true);
    }
  });

  it("hides on the cart and the whole checkout flow", () => {
    for (const path of ["/cart", "/checkout", "/checkout/success", "/checkout/"]) {
      expect(isAdvisorLauncherVisible(path)).toBe(false);
    }
  });

  it("hides while the cart drawer or any overlay is open", () => {
    expect(isAdvisorLauncherVisible("/", { cartOpen: true })).toBe(false);
    expect(isAdvisorLauncherVisible("/shop", { overlayOpen: true })).toBe(false);
    expect(
      isAdvisorLauncherVisible("/product/pf680", {
        cartOpen: false,
        overlayOpen: false,
      }),
    ).toBe(true);
  });

  it("ignores query strings and trailing slashes", () => {
    expect(isAdvisorLauncherVisible("/cart/?x=1")).toBe(false);
    expect(isAdvisorLauncherVisible("/shop?form=oil")).toBe(true);
  });
});
