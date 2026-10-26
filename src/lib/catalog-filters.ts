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

import type { Product } from "@/types";
import {
  GENDERS,
  PERFORMANCES,
  PRODUCT_TYPES,
  SEASONS,
} from "./product-vocabulary";
import { PUBLIC_TIER_LABELS, type House } from "./product-labels";
import type { SortOption } from "./sort-helpers";

// ─── Size group ─────────────────────────────────────────────────────────────

/**
 * The four bottle sizes every product is sold in — the catalogue's own labels,
 * never a new one.
 *
 * `data/products.json` carries exactly these four labels (40 products each), so
 * this list is data, not a design choice. Matching is availability-based: a
 * product matches "100 مل" only when that size is actually in stock, which is
 * what a shopper means by the filter. The value and the label are the same
 * string, so a size never needs a translation table.
 */
export const SIZE_FILTER_VALUES = [
  "10 مل",
  "30 مل",
  "50 مل",
  "100 مل",
] as const;

export type SizeFilterValue = (typeof SIZE_FILTER_VALUES)[number];

// ─── State ──────────────────────────────────────────────────────────────────

/** Every filter group, in URL order. `available` is a toggle, not a list. */
export const FILTER_KEYS = [
  "gender",
  "style",
  "tier",
  "season",
  "performance",
  "size",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export interface CatalogState {
  gender: string[];
  style: string[];
  tier: string[];
  season: string[];
  performance: string[];
  /** Bottle sizes (see SIZE_FILTER_VALUES). */
  size: string[];
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
  size: [],
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
  size: SIZE_FILTER_VALUES,
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
    size: readList(params, "size"),
    available: firstValue(params.available) === "1",
    sort,
    q: firstValue(params.q).trim().slice(0, MAX_QUERY_LENGTH),
  };
}

/**
 * Write a state back as a query string, in a fixed order.
 *
 * Defaults are omitted, so a clean catalogue has an empty query string.
 *
 * `omit` drops groups that the page has locked (a category page pins gender),
 * so the URL of `/shop/men` never repeats what the route already says.
 */
export function serializeCatalogState(
  state: CatalogState,
  omit: readonly FilterKey[] = [],
): string {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    if (omit.includes(key)) continue;
    const values = state[key].filter((value) => value !== "");
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (state.available) params.set("available", "1");
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.q) params.set("q", state.q);

  return params.toString();
}

/** A catalogue URL for a state. */
export function catalogHref(
  state: CatalogState,
  basePath = "/shop",
): string {
  const query = serializeCatalogState(state);
  return query ? `${basePath}?${query}` : basePath;
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
export function countActiveFilters(
  state: CatalogState,
  omit: readonly FilterKey[] = [],
): number {
  const values = FILTER_KEYS.reduce(
    (sum, key) => (omit.includes(key) ? sum : sum + state[key].length),
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
  // `size` values are already the labels the shopper sees.
  return value;
}

/** The product fields a facet compares against (size is computed). */
export function productFacetValue(
  product: Product,
  key: Exclude<FilterKey, "size">,
): string | null {
  if (key === "gender") return product.gender;
  if (key === "style") return product.type;
  if (key === "tier") return product.house;
  if (key === "season") return product.season;
  return product.performance;
}
