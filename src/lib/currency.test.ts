import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber, formatSizeLabel } from "./currency";

describe("formatPrice", () => {
  it("formats integer price with Arabic numerals", () => {
    const result = formatPrice(1200);
    expect(result).toContain("١٬٢٠٠");
    expect(result).toContain("ج.م");
  });

  it("formats decimal price", () => {
    const result = formatPrice(50.5);
    expect(result).toContain("٥٠٫٥");
  });

  it("formats zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("٠");
  });
});

describe("formatNumber", () => {
  it("formats number without currency", () => {
    const result = formatNumber(1200);
    expect(result).toBe("١٬٢٠٠");
  });

  it("formats whole and decimal sizes while preserving the original suffix", () => {
    expect(formatSizeLabel("10 مل")).toBe("١٠ مل");
    expect(formatSizeLabel("2.5 مل")).toBe("٢٫٥ مل");
    expect(formatSizeLabel(" 30 مللى")).toBe(" ٣٠ مللى");
  });

  it("leaves labels without a numeric prefix unchanged", () => {
    expect(formatSizeLabel("حجم خاص")).toBe("حجم خاص");
  });
});
