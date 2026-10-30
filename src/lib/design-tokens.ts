/**
 * design-tokens — a TypeScript mirror of the token layer in globals.css.
 *
 * The CSS is the render source of truth; this module reproduces the same
 * values (including the `color-mix(in srgb, …)` derivations) so the dev
 * design-system page and the contrast test can measure the real palette
 * instead of guessing at it.
 *
 * Keep in sync with the `:root` block in src/app/globals.css.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * `color-mix(in srgb, base <percent>%, other)` for two opaque colours:
 * a straight per-channel interpolation in gamma-encoded sRGB.
 */
export function mix(baseHex: string, otherHex: string, basePercent: number): string {
  const a = hexToRgb(baseHex);
  const b = hexToRgb(otherHex);
  const p = basePercent / 100;
  return rgbToHex({
    r: a.r * p + b.r * (1 - p),
    g: a.g * p + b.g * (1 - p),
    b: a.b * p + b.b * (1 - p),
  });
}

function channelLuminance(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG 2.1 contrast ratio, rounded to two decimals. */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

export interface BrandInputs {
  purple: string;
  gold: string;
  green: string;
  white: string;
}

/** Fallbacks matching data/theme.json. */
export const BRAND: BrandInputs = {
  purple: "#632989",
  gold: "#D4AF37",
  green: "#9CD676",
  white: "#FFFFFF",
};

const NEUTRALS = {
  "neutral-50": "#FBFAF9",
  "neutral-100": "#F5F3F7",
  "neutral-200": "#E7E3EC",
  "neutral-300": "#C9C1D4",
  "neutral-400": "#6E6779",
  "neutral-500": "#5B5B66",
  "neutral-600": "#4A4A55",
  "neutral-700": "#36363F",
  "neutral-800": "#1D1D1F",
  "neutral-900": "#111113",
} as const;

export type Palette = Record<string, string>;

/**
 * Every colour token the site can render, resolved to a hex value.
 * Brand-derived tokens follow the color-mix recipes in globals.css.
 */
export function buildPalette(brand: BrandInputs = BRAND): Palette {
  const black = "#000000";
  return {
    "brand-purple": brand.purple.toUpperCase(),
    "brand-gold": brand.gold.toUpperCase(),
    "brand-green": brand.green.toUpperCase(),
    "brand-white": brand.white.toUpperCase(),

    "purple-50": mix(brand.purple, brand.white, 6),
    "purple-100": mix(brand.purple, brand.white, 12),
    "purple-200": mix(brand.purple, brand.white, 24),
    "purple-400": mix(brand.purple, brand.white, 70),
    "purple-600": brand.purple.toUpperCase(),
    "purple-700": mix(brand.purple, black, 84),
    "purple-950": mix(brand.purple, "#0C0510", 46),

    "gold-50": mix(brand.gold, brand.white, 9),
    "gold-100": mix(brand.gold, brand.white, 18),
    "gold-300": mix(brand.gold, brand.white, 60),
    "gold-500": brand.gold.toUpperCase(),
    "gold-700": mix(brand.gold, black, 62),

    "green-50": mix(brand.green, brand.white, 14),
    "green-100": mix(brand.green, brand.white, 26),
    "green-700": mix(brand.green, "#12340A", 40),

    ...NEUTRALS,

    bg: NEUTRALS["neutral-50"],
    surface: brand.white.toUpperCase(),
    "surface-muted": NEUTRALS["neutral-100"],
    border: NEUTRALS["neutral-200"],
    "border-strong": "#8C8499",
    text: NEUTRALS["neutral-800"],
    "text-muted": NEUTRALS["neutral-500"],
    brand: brand.purple.toUpperCase(),
    positive: mix(brand.green, "#12340A", 40),
    "gold-text": mix(brand.gold, black, 62),
    danger: "#B3261E",
  };
}

export const PALETTE = buildPalette();

export interface ContrastPair {
  /** What the pair is used for, in developer terms. */
  label: string;
  foreground: string;
  background: string;
  /** WCAG minimum: 4.5 for body text, 3 for large text and UI edges. */
  min: number;
}

/**
 * Every foreground/background combination the design system actually uses.
 * The unit test fails if any of these drops below its WCAG minimum.
 */
export function buildContrastPairs(palette: Palette = PALETTE): ContrastPair[] {
  const pairs: Array<[string, string, string, number?]> = [
    ["body text on page", palette.text, palette.bg],
    ["body text on surface", palette.text, palette.surface],
    ["body text on muted surface", palette.text, palette["surface-muted"]],
    ["muted text on page", palette["text-muted"], palette.bg],
    ["muted text on surface", palette["text-muted"], palette.surface],
    ["muted text on muted surface", palette["text-muted"], palette["surface-muted"]],
    ["brand text on surface", palette.brand, palette.surface],
    ["brand text on brand-50", palette.brand, palette["purple-50"]],
    ["white on brand (primary button)", palette["brand-white"], palette.brand],
    ["white on brand hover", palette["brand-white"], palette["purple-700"]],
    ["brand text on white (secondary button)", palette.brand, palette.surface],
    ["danger text on surface", palette.danger, palette.surface],
    ["danger text on danger-10", palette.danger, mix(palette.danger, palette.surface, 10)],
    ["white on danger (destructive button)", palette["brand-white"], palette.danger],
    ["gold text on gold-50 (soft gold tint)", palette["gold-text"], palette["gold-50"]],
    ["gold text on surface", palette["gold-text"], palette.surface],
    // The premium (فاخر) meta line sits on the page and on card surfaces.
    ["premium gold text on page (ivory)", palette["gold-text"], palette.bg],
    ["premium gold text on muted surface", palette["gold-text"], palette["surface-muted"]],
    ["positive text on green-50 (status chip)", palette.positive, palette["green-50"]],
    ["positive text on surface", palette.positive, palette.surface],
    ["white on positive (success state)", palette["brand-white"], palette.positive],
    ["white on purple-950 (dark section)", palette["brand-white"], palette["purple-950"]],
    ["border-strong vs surface (UI edge)", palette["border-strong"], palette.surface, 3],
    ["brand vs surface (focus ring edge)", palette.brand, palette.surface, 3],
  ];
  return pairs.map(([label, foreground, background, min]) => ({
    label,
    foreground,
    background,
    min: min ?? 4.5,
  }));
}

export const CONTRAST_PAIRS = buildContrastPairs();

/** Type scale utilities, in the order they appear on the page. */
export const TYPE_SCALE = [
  {
    name: "display",
    className: "text-display",
    sample: "عطر فاخر",
    note: "clamp(40 → 64px) / 1.15",
  },
  {
    name: "title-1",
    className: "text-title-1",
    sample: "عنوان أول",
    note: "clamp(32 → 48px) / 1.25",
  },
  {
    name: "title-2",
    className: "text-title-2",
    sample: "عنوان ثانٍ",
    note: "clamp(26 → 32px) / 1.25",
  },
  {
    name: "title-3",
    className: "text-title-3",
    sample: "عنوان ثالث",
    note: "clamp(20 → 24px) / 1.25",
  },
  {
    name: "headline",
    className: "text-headline",
    sample: "اسم المنتج",
    note: "clamp(18 → 20px) / 1.4",
  },
  {
    name: "body",
    className: "text-body",
    sample: "نص أساسي للقراءة الطويلة.",
    note: "clamp(16 → 17px) / 1.7",
  },
  {
    name: "caption",
    className: "text-caption",
    sample: "تسمية صغيرة أو رقم",
    note: "14px / 1.6 — the floor",
  },
] as const;
