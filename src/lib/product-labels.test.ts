import { describe, it, expect } from "vitest";
import {
  CONCENTRATIONS,
  SCENT_FAMILIES,
} from "@/schemas/product-schema";
import {
  CONCENTRATION_CODES,
  CONCENTRATION_LABELS,
  FAMILY_LABELS,
  concentrationLabel,
  familyLabel,
  formatConcentrationSize,
  sortSizesByVolume,
} from "./product-labels";

describe("sortSizesByVolume", () => {
  const label = (sizes: { label: string }[]) => sizes.map((size) => size.label).join(" | ");

  it("keeps an ascending catalogue untouched", () => {
    const sizes = [{ label: "10 مل" }, { label: "30 مل" }, { label: "50 مل" }, { label: "100 مل" }];
    expect(label(sortSizesByVolume(sizes))).toBe("10 مل | 30 مل | 50 مل | 100 مل");
  });

  it("orders the importer's descending oil sizes small to large", () => {
    // Regression (BUG-004): 12/6/3 rendered backwards next to 10/30/50/100.
    const sizes = [{ label: "12 مل" }, { label: "6 مل" }, { label: "3 مل" }];
    expect(label(sortSizesByVolume(sizes))).toBe("3 مل | 6 مل | 12 مل");
  });

  it("does not mutate the input array", () => {
    const sizes = [{ label: "50 مل" }, { label: "10 مل" }];
    sortSizesByVolume(sizes);
    expect(label(sizes)).toBe("50 مل | 10 مل");
  });

  it("puts an unnumbered label last instead of first", () => {
    const sizes = [{ label: "حجم خاص" }, { label: "10 مل" }];
    expect(label(sortSizesByVolume(sizes))).toBe("10 مل | حجم خاص");
  });
});

describe("enum labels", () => {
  it("covers every concentration", () => {
    for (const value of CONCENTRATIONS) {
      expect(CONCENTRATION_CODES[value]).toBeTruthy();
      expect(CONCENTRATION_LABELS[value]).toBeTruthy();
    }
  });

  it("covers every scent family", () => {
    for (const value of SCENT_FAMILIES) {
      expect(FAMILY_LABELS[value]).toBeTruthy();
    }
  });

  it("returns null rather than guessing a label", () => {
    expect(concentrationLabel(undefined)).toBeNull();
    expect(concentrationLabel(null)).toBeNull();
    expect(familyLabel(undefined)).toBeNull();
    expect(familyLabel(null)).toBeNull();
  });
});

describe("formatConcentrationSize", () => {
  it("formats a full pair", () => {
    expect(formatConcentrationSize("edp", 50)).toBe("EDP · 50 مل");
    expect(formatConcentrationSize("parfum", 100)).toBe("PARFUM · 100 مل");
    expect(formatConcentrationSize("oil", 10)).toBe("OIL · 10 مل");
  });

  it("returns null when either half is missing", () => {
    expect(formatConcentrationSize(undefined, 50)).toBeNull();
    expect(formatConcentrationSize("edp", undefined)).toBeNull();
    expect(formatConcentrationSize("edp", null)).toBeNull();
    expect(formatConcentrationSize(null, null)).toBeNull();
  });

  it("returns null for a meaningless volume", () => {
    expect(formatConcentrationSize("edp", 0)).toBeNull();
    expect(formatConcentrationSize("edp", -50)).toBeNull();
  });
});
