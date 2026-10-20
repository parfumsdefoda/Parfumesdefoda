import { describe, expect, it } from "vitest";
import { isUnavailableBadge, isUnavailableProduct } from "./product-availability";

describe("isUnavailableBadge", () => {
  it("recognises the catalogue's out-of-stock badge", () => {
    expect(isUnavailableBadge("غير متوفر حالياً")).toBe(true);
  });

  it("recognises common variants", () => {
    expect(isUnavailableBadge("غير متاح")).toBe(true);
    expect(isUnavailableBadge("نفد المخزون")).toBe(true);
    expect(isUnavailableBadge("Out of stock")).toBe(true);
  });

  it("does not treat marketing badges as availability", () => {
    expect(isUnavailableBadge("جديد")).toBe(false);
    expect(isUnavailableBadge("الأكثر مبيعاً")).toBe(false);
    expect(isUnavailableBadge("إصدار محدود")).toBe(false);
    expect(isUnavailableBadge("")).toBe(false);
    expect(isUnavailableBadge(null)).toBe(false);
    expect(isUnavailableBadge(undefined)).toBe(false);
  });
});

describe("isUnavailableProduct", () => {
  it("is driven by inStock", () => {
    expect(isUnavailableProduct({ inStock: false, status: "active" })).toBe(true);
    expect(isUnavailableProduct({ inStock: true, status: "active" })).toBe(false);
  });

  it("is driven by a non-active status", () => {
    expect(isUnavailableProduct({ inStock: true, status: "inactive" })).toBe(true);
    expect(isUnavailableProduct({ inStock: true, status: "archived" })).toBe(true);
  });

  it("treats a missing inStock as available", () => {
    expect(isUnavailableProduct({})).toBe(false);
  });
});
