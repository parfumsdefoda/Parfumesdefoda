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
} from "./product-labels";

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
