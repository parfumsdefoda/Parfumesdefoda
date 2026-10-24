/**
 * The catalogue's shop-facing vocabularies.
 *
 * Kept separate from `src/schemas/product-schema.ts` on purpose: the schema
 * imports zod, and the filter bar only needs the lists. Importing the schema
 * from a client component would pull the whole validator into the browser
 * bundle for five arrays of strings.
 *
 * Pure and client-safe. The schema builds its enums from these same lists, so
 * there is exactly one definition of each.
 */

export const GENDERS = ["رجالي", "نسائي", "للجنسين"] as const;
export const PRODUCT_TYPES = ["شرقي", "غربي"] as const;
export const HOUSES = ["ديزاينر", "نيش", "دووب"] as const;
export const SEASONS = ["صيفي", "شتوي", "خريفي", "ربيعي"] as const;
export const PERFORMANCES = [
  "أداء ضعيف",
  "أداء متوسط",
  "أداء قوي",
  "أداء صاروخي",
] as const;

/** Concentration codes — a fixed set, never free text. */
export const CONCENTRATIONS = ["parfum", "edp", "edt", "edc", "oil"] as const;

/** Scent families — a fixed set, never free text. */
export const SCENT_FAMILIES = [
  "aromatic",
  "citrus",
  "floral",
  "fougere",
  "fresh",
  "gourmand",
  "leather",
  "musk",
  "oriental",
  "woody",
] as const;

export type Gender = (typeof GENDERS)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type House = (typeof HOUSES)[number];
export type Season = (typeof SEASONS)[number];
export type Performance = (typeof PERFORMANCES)[number];
export type Concentration = (typeof CONCENTRATIONS)[number];
export type ScentFamily = (typeof SCENT_FAMILIES)[number];
