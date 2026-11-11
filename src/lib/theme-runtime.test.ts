import { describe, expect, it } from "vitest";
import {
  DEFAULT_MOTION,
  DEFAULT_PALETTE,
  MOTION_LEVELS,
  THEME_PALETTES,
  resolveMotion,
  resolvePalette,
  themeAttributes,
} from "./theme-runtime";

/**
 * The theme axes come from an owner-editable JSON file, so every input has to
 * be treated as untrusted: a typo must fall back to the store's shipped look,
 * never to an attribute the CSS does not declare.
 */
describe("theme-runtime", () => {
  it("resolves the store defaults when the file says nothing", () => {
    expect(resolvePalette(null)).toBe(DEFAULT_PALETTE);
    expect(resolvePalette(undefined)).toBe(DEFAULT_PALETTE);
    expect(resolvePalette({})).toBe(DEFAULT_PALETTE);
    expect(resolveMotion({})).toBe(DEFAULT_MOTION);
    expect(DEFAULT_PALETTE).toBe("brand");
    expect(DEFAULT_MOTION).toBe("moderate");
  });

  it("accepts every palette the CSS declares", () => {
    for (const palette of THEME_PALETTES) {
      expect(resolvePalette({ palette })).toBe(palette);
    }
  });

  it("accepts every motion level the CSS declares", () => {
    for (const motion of MOTION_LEVELS) {
      expect(resolveMotion({ motion })).toBe(motion);
    }
  });

  it("normalises case and surrounding whitespace", () => {
    expect(resolvePalette({ palette: "  NOIR-OR " })).toBe("noir-or");
    expect(resolveMotion({ motion: "Subtle" })).toBe("subtle");
  });

  it("falls back instead of forwarding an undeclared value", () => {
    expect(resolvePalette({ palette: "midnight" })).toBe(DEFAULT_PALETTE);
    expect(resolvePalette({ palette: 42 })).toBe(DEFAULT_PALETTE);
    expect(resolvePalette({ palette: "" })).toBe(DEFAULT_PALETTE);
    expect(resolveMotion({ motion: "wild" })).toBe(DEFAULT_MOTION);
    expect(resolveMotion({ motion: null })).toBe(DEFAULT_MOTION);
  });

  it("returns both attributes for the html element", () => {
    expect(themeAttributes({ palette: "bleu-froid", motion: "none" })).toEqual({
      palette: "bleu-froid",
      motion: "none",
    });
    expect(themeAttributes({ palette: "ibiza", motion: "max" })).toEqual({
      palette: DEFAULT_PALETTE,
      motion: DEFAULT_MOTION,
    });
  });
});
