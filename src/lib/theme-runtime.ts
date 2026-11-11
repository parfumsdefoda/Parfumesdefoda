/**
 * theme-runtime — the two theme axes the layout hands to CSS.
 *
 * `data/theme.json` owns the four brand hexes; this module owns the *choices*
 * that hang off them:
 *
 *   palette  which token preset is active   → <html data-palette="…">
 *   motion   how much motion the site uses  → <html data-motion="…">
 *
 * Both are resolved on the server and written onto `<html>` during the same
 * render, so the correct preset paints on the first frame — the same contract
 * the brand hexes already follow (see src/app/layout.tsx).
 *
 * Pure and dependency-free on purpose: `src/types/services.ts` imports the
 * types, `layout.tsx` imports the resolver, and both live in the client-safe
 * half of the tree (no `node:fs`).
 */

/** Preset ids declared in src/app/globals.css. */
export const THEME_PALETTES = [
  /** Light paper, brand purple, gold detail — the store's default. */
  "brand",
  /** Near-black canvas, gold action. */
  "noir-or",
  /** Ivory paper, gold action. */
  "ivoire-or",
  /** Ink blue canvas, pale silver action. */
  "bleu-froid",
  /** Graphite canvas, bone action. */
  "monochrome",
] as const;

export type ThemePalette = (typeof THEME_PALETTES)[number];

/** Motion intensities declared in src/app/globals.css. */
export const MOTION_LEVELS = ["none", "subtle", "moderate"] as const;

export type MotionIntensity = (typeof MOTION_LEVELS)[number];

export const DEFAULT_PALETTE: ThemePalette = "brand";
export const DEFAULT_MOTION: MotionIntensity = "moderate";

/** The slice of data/theme.json this module reads. */
export interface ThemeAxes {
  palette?: unknown;
  motion?: unknown;
}

function pick<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const normalised = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalised)
    ? (normalised as T)
    : fallback;
}

/**
 * A palette the CSS actually declares — anything else falls back to `brand`
 * rather than leaving `<html>` with a preset that resolves every token to
 * `transparent` (an empty attribute selector would match nothing and the page
 * would render with inherited, not themed, colours).
 */
export function resolvePalette(theme: ThemeAxes | null | undefined): ThemePalette {
  return pick(THEME_PALETTES, theme?.palette, DEFAULT_PALETTE);
}

/** Motion intensity, defaulting to the store's current pacing. */
export function resolveMotion(theme: ThemeAxes | null | undefined): MotionIntensity {
  return pick(MOTION_LEVELS, theme?.motion, DEFAULT_MOTION);
}

/** Both attributes in one call, for the layout's `<html>` element. */
export function themeAttributes(theme: ThemeAxes | null | undefined): {
  palette: ThemePalette;
  motion: MotionIntensity;
} {
  return { palette: resolvePalette(theme), motion: resolveMotion(theme) };
}
