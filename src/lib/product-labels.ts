/**
 * Product enum labels — the ONE place the catalogue's enums get Arabic.
 *
 * The schema stores stable codes (`edp`, `woody`); every surface that shows
 * them to a customer resolves the label through this module, so a new family
 * is added once instead of in five components.
 *
 * Nothing is inferred: a label is only produced for a value that exists.
 */

import type { Concentration, Product, ScentFamily } from "@/schemas/product-schema";

/** Brand tier as the catalogue stores it (الدار). */
export type House = Product["house"];

/** Latin abbreviations used on perfume listings, Arabic market included. */
export const CONCENTRATION_CODES: Record<Concentration, string> = {
  parfum: "PARFUM",
  edp: "EDP",
  edt: "EDT",
  edc: "EDC",
  oil: "OIL",
};

/** Spelled-out Arabic names. */
export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  parfum: "بارفان",
  edp: "أو دو بارفان",
  edt: "أو دو تواليت",
  edc: "أو دو كولونيا",
  oil: "زيت عطري",
};

export const FAMILY_LABELS: Record<ScentFamily, string> = {
  aromatic: "أروماتي",
  citrus: "حمضيات",
  floral: "زهري",
  fougere: "فوجير",
  fresh: "منعش",
  gourmand: "جورماند",
  leather: "جلدي",
  musk: "مسكي",
  oriental: "شرقي",
  woody: "خشبي",
};

/**
 * Public tier labels — the ONE lookup for الدار on shop surfaces.
 *
 * `دووب` maps to `null` on purpose: a clone is never labelled as one on a card
 * or in a filter, because the label sells against the product. The data keeps
 * the value (search, chat and the owner's CSV still see it), the shopper does
 * not. Filters build their options from this map, so a null value simply never
 * appears as an option.
 */
export const PUBLIC_TIER_LABELS: Record<House, string | null> = {
  "ديزاينر": "ديزاينر",
  "نيش": "نيش",
  "دووب": null,
};

/** Display label for a tier, or null when the tier must not be shown. */
export function publicTierLabel(house?: House | null): string | null {
  if (!house) return null;
  return PUBLIC_TIER_LABELS[house] ?? null;
}

export function concentrationLabel(
  concentration?: Concentration | null,
): string | null {
  if (!concentration) return null;
  return CONCENTRATION_LABELS[concentration] ?? null;
}

export function familyLabel(family?: ScentFamily | null): string | null {
  if (!family) return null;
  return FAMILY_LABELS[family] ?? null;
}

/**
 * Sizes in one stable order (smallest first), whatever order the catalogue
 * stores them in.
 *
 * `data/products.json` is not uniform: the four original sizes are stored
 * 10/30/50/100 while a product created by the master importer is stored
 * 100/50/30/10 (the importer sorts by ml descending). A size selector must not
 * flip its reading order because of a data detail, and the arrow-key walk in
 * the radiogroup follows the rendered order.
 */
export function sortSizesByVolume<T extends { label: string }>(
  sizes: readonly T[],
): T[] {
  const ml = (label: string) => {
    const match = /(\d+)/.exec(label);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  return [...sizes].sort((a, b) => ml(a.label) - ml(b.label));
}

/**
 * Compact spec line, e.g. `EDP · 50 مل`.
 *
 * Returns null unless BOTH halves are known — a half-filled badge would claim
 * something the catalogue does not have.
 */
export function formatConcentrationSize(
  concentration?: Concentration | null,
  ml?: number | null,
): string | null {
  if (!concentration || !ml || ml <= 0) return null;
  const code = CONCENTRATION_CODES[concentration];
  if (!code) return null;
  return `${code} · ${ml} مل`;
}
