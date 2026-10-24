/**
 * Catalogue state — the URL is the single source of truth.
 *
 * Every filter, the sort and the search query live in the query string, so a
 * catalogue view is shareable, survives a reload and works with back/forward.
 * The server parses it and renders the grid; the client only rewrites the URL.
 *
 * Rules:
 * - Unknown values are ignored, never applied. A hand-edited URL can only ever
 *   produce a valid state.
 * - The serialised form is deterministic (fixed key order, no empty values), so
 *   the same view always has the same URL and a link never accumulates noise.
 * - Values are the catalogue's own Arabic labels (the data is the vocabulary);
 *   tiers come from PUBLIC_TIER_LABELS, so `دووب` can never be a filter.
 *
 * Pure and client-safe.
 */

import {
  GENDERS,
  PERFORMANCES,
  PRODUCT_TYPES,
  SEASONS,
  type Product,
} from "../schemas/product-schema";
import { PUBLIC_TIER_LABELS, type House } from "./product-labels";
import type { SortOption } from "./sort-helpers";

// ─── Price bands ────────────────────────────────────────────────────────────

export interface PriceBucket {
  id: string;
  /** Lower bound, inclusive. Absent means "from 0". */
  min?: number;
  /** Upper bound, inclusive. Absent means "and above". */
  max?: number;
  /** Arabic default label; the page may pass a localised one. */
  label: string;
}

/**
 * Bands over the LOWEST in-stock price — "how much does this product start at".
 *
 * The boundaries are the catalogue's own breakpoints, not invented round
 * numbers: data/products.json currently starts at 120, 150, 180 and 220 EGP,
 * so 120 and 150 are the only cuts that separate real groups of products. The
 * catalogue clusters hard at the entry size (26 products start at 120), which
 * the facet counts show honestly; see docs/Design-System.md.
 */
export const PRICE_BUCKETS: PriceBucket[] = [
  { id: "up-to-120", max: 120, label: "حتى ١٢٠ ج.م" },
  { id: "121-to-150", min: 121, max: 150, label: "١٢١ – ١٥٠ ج.م" },
  { id: "over-150", min: 151, label: "أكثر من ١٥٠ ج.م" },
];

export const PRICE_BUCKET_IDS = PRICE_BUCKETS.map((bucket) => bucket.id);

/** True when a price falls inside the band. */
export function priceInBucket(price: number | null, id: string): boolean {
  if (price === null) return false;
  const bucket = PRICE_BUCKETS.find((entry) => entry.id === id);
  if (!bucket) return false;
  if (bucket.min !== undefined && price < bucket.min) return false;
  if (bucket.max !== undefined && price > bucket.max) return false;
  return true;
}

// ─── State ──────────────────────────────────────────────────────────────────

/** Every filter group, in URL order. `available` is a toggle, not a list. */
export const FILTER_KEYS = [
  "gender",
  "style",
  "tier",
  "season",
  "performance",
  "price",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export interface CatalogState {
  gender: string[];
  style: string[];
  tier: string[];
  season: string[];
  performance: string[];
  price: string[];
  /** "المتوفر فقط" */
  available: boolean;
  sort: SortOption;
  q: string;
}

export const DEFAULT_SORT: SortOption = "featured";

/** The URL state of an untouched catalogue. */
export const EMPTY_CATALOG_STATE: CatalogState = {
  gender: [],
  style: [],
  tier: [],
  season: [],
  performance: [],
  price: [],
  available: false,
  sort: DEFAULT_SORT,
  q: "",
};

/** Tiers that may appear as a filter — `دووب` has no public label. */
export const FILTERABLE_TIERS = (Object.keys(PUBLIC_TIER_LABELS) as House[]).filter(
  (house) => PUBLIC_TIER_LABELS[house] !== null,
);

const ALLOWED: Record<FilterKey, readonly string[]> = {
  gender: GENDERS,
  style: PRODUCT_TYPES,
  tier: FILTERABLE_TIERS,
  season: SEASONS,
  performance: PERFORMANCES,
  price: PRICE_BUCKET_IDS,
};

const SORT_OPTIONS: readonly SortOption[] = [
  "featured",
  "price-asc",
  "price-desc",
  "alphabetical",
];

/** Longest search query we keep — a URL is not a text field. */
export const MAX_QUERY_LENGTH = 80;

export type CatalogSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function readList(
  params: CatalogSearchParams,
  key: FilterKey,
): string[] {
  const allowed = ALLOWED[key];
  const parts = firstValue(params[key])
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "" && allowed.includes(value));
  return [...new Set(parts)];
}

/**
 * Read a catalogue state from the query string.
 *
 * Anything the catalogue does not recognise is dropped silently, and repeated
 * values are collapsed — a malformed link degrades to a working page.
 */
export function parseCatalogState(params: CatalogSearchParams): CatalogState {
  const sortRaw = firstValue(params.sort).trim();
  const sort = SORT_OPTIONS.includes(sortRaw as SortOption)
    ? (sortRaw as SortOption)
    : DEFAULT_SORT;

  return {
    gender: readList(params, "gender"),
    style: readList(params, "style"),
    tier: readList(params, "tier"),
    season: readList(params, "season"),
    performance: readList(params, "performance"),
    price: readList(params, "price"),
    available: firstValue(params.available) === "1",
    sort,
    q: firstValue(params.q).trim().slice(0, MAX_QUERY_LENGTH),
  };
}

/**
 * Write a state back as a query string, in a fixed order.
 * Defaults are omitted, so a clean catalogue has an empty query string.
 */
export function serializeCatalogState(state: CatalogState): string {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const values = state[key].filter((value) => value !== "");
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (state.available) params.set("available", "1");
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.q) params.set("q", state.q);

  return params.toString();
}

/** A catalogue URL for a state. */
export function catalogHref(state: CatalogState): string {
  const query = serializeCatalogState(state);
  return query ? `/?${query}` : "/";
}

// ─── Transitions ────────────────────────────────────────────────────────────

/** Add or remove one value of a group. */
export function toggleFacetValue(
  state: CatalogState,
  key: FilterKey,
  value: string,
): CatalogState {
  const current = state[key];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return { ...state, [key]: next };
}

/** Drop one value of a group (a chip's ×). */
export function removeFacetValue(
  state: CatalogState,
  key: FilterKey,
  value: string,
): CatalogState {
  return { ...state, [key]: state[key].filter((entry) => entry !== value) };
}

export function setSort(state: CatalogState, sort: SortOption): CatalogState {
  return { ...state, sort };
}

export function setQuery(state: CatalogState, q: string): CatalogState {
  return { ...state, q: q.trim().slice(0, MAX_QUERY_LENGTH) };
}

export function setAvailable(state: CatalogState, available: boolean): CatalogState {
  return { ...state, available };
}

/** Every filter and the search cleared; the sort is preserved. */
export function clearCatalogFilters(state: CatalogState): CatalogState {
  return { ...EMPTY_CATALOG_STATE, sort: state.sort };
}

/** How many filter values (plus the availability toggle) are active. */
export function countActiveFilters(state: CatalogState): number {
  const values = FILTER_KEYS.reduce(
    (sum, key) => sum + state[key].length,
    0,
  );
  return values + (state.available ? 1 : 0);
}

/** True when nothing narrows the catalogue. */
export function isDefaultCatalogState(state: CatalogState): boolean {
  return countActiveFilters(state) === 0 && state.q === "";
}

// ─── Labels ─────────────────────────────────────────────────────────────────

/** Display label for one filter value. */
export function facetValueLabel(key: FilterKey, value: string): string {
  if (key === "tier") {
    return PUBLIC_TIER_LABELS[value as House] ?? value;
  }
  if (key === "price") {
    return PRICE_BUCKETS.find((bucket) => bucket.id === value)?.label ?? value;
  }
  return value;
}

/** The product fields a facet compares against (price is computed). */
export function productFacetValue(
  product: Product,
  key: Exclude<FilterKey, "price">,
): string | null {
  if (key === "gender") return product.gender;
  if (key === "style") return product.type;
  if (key === "tier") return product.house;
  if (key === "season") return product.season;
  return product.performance;
}
