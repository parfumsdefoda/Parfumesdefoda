/**
 * Product enum labels — the ONE place the catalogue's enums get Arabic.
 *
 * The schema stores stable codes (`edp`, `woody`); every surface that shows
 * them to a customer resolves the label through this module, so a new family
 * is added once instead of in five components.
 *
 * Nothing is inferred: a label is only produced for a value that exists.
 */

import type { Concentration, ScentFamily } from "@/schemas/product-schema";

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
  parfum: "بارفوم",
  edp: "أو دو بارفوم",
  edt: "أو دو تواليت",
  edc: "أو دو كولونيا",
  oil: "زيت عطري",
};

export const FAMILY_LABELS: Record<ScentFamily, string> = {
  aromatic: "أروماتي",
  citrus: "حمضي",
  floral: "زهري",
  fougere: "فوجير",
  fresh: "منعش",
  gourmand: "جورماند",
  leather: "جلدي",
  musk: "مسكي",
  oriental: "شرقي",
  woody: "خشبي",
};

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
