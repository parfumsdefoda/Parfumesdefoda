import { describe, it, expect } from "vitest";
import {
  PLACEHOLDER_IMAGE,
  isComingSoon,
  isPlaceholderImage,
  isUnavailableBadge,
  isUnavailableProduct,
} from "./product-availability";

describe("coming soon", () => {
  it("recognises the shared placeholder photo", () => {
    expect(isPlaceholderImage(PLACEHOLDER_IMAGE)).toBe(true);
    expect(isPlaceholderImage("/products/PF020.png")).toBe(false);
    expect(isPlaceholderImage(null)).toBe(false);
  });

  it("marks only placeholder products as coming soon", () => {
    expect(isComingSoon({ image: PLACEHOLDER_IMAGE })).toBe(true);
    expect(isComingSoon({ image: "/products/PF020.png" })).toBe(false);
    expect(isComingSoon({})).toBe(false);
  });
});

describe("availability", () => {
  it("treats an availability sentence as a bad marketing badge", () => {
    expect(isUnavailableBadge("غير متوفر حالياً")).toBe(true);
    expect(isUnavailableBadge("جديد")).toBe(false);
  });

  it("reads the state, not the badge", () => {
    expect(isUnavailableProduct({ inStock: false })).toBe(true);
    expect(isUnavailableProduct({ inStock: true, status: "active" })).toBe(false);
    expect(isUnavailableProduct({ inStock: true, status: "draft" })).toBe(true);
  });
});
