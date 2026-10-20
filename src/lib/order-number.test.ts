import { afterEach, describe, expect, it } from "vitest";
import {
  formatDateStr,
  formatOrderNumber,
  randomOrderSuffix,
} from "./order-number";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("formatOrderNumber", () => {
  it("builds PDF-YYYYMMDD-NNNNN", () => {
    expect(formatOrderNumber(new Date(2026, 6, 16), 125)).toBe(
      "PDF-20260716-00125",
    );
  });

  it("pads the sequence to five digits", () => {
    expect(formatOrderNumber(new Date(2026, 0, 1), 1)).toBe("PDF-20260101-00001");
  });

  it("keeps a string suffix as-is", () => {
    expect(formatOrderNumber(new Date(2026, 11, 31), "AB7KQ")).toBe(
      "PDF-20261231-AB7KQ",
    );
  });

  it("zero-pads month and day", () => {
    expect(formatDateStr(new Date(2026, 8, 5))).toBe("20260905");
  });
});

describe("randomOrderSuffix", () => {
  it("returns five unambiguous characters", () => {
    for (let i = 0; i < 25; i++) {
      const suffix = randomOrderSuffix();
      expect(suffix).toHaveLength(5);
      expect(suffix).toMatch(/^[A-HJKMNP-Z2-9]{5}$/);
    }
  });
});
