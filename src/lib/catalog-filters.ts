/**
 * Catalogue state — the URL is the single source of truth.
 *
 * Every visible filter, the sort and the search query live in the query
 * string, so a catalogue view is shareable, survives a reload and works with
 * back/forward. The server parses it and renders the grid; the client only
 * rewrites the URL.
 *
 * The filter drawer offers exactly two groups: gender (الجنس) and the
 * foda-original collection (عطور فوده الأصلية), plus the sort. The former
 * type / house / performance / size / in-stock groups were removed — the
 * product FIELDS (type, house, performance, sizes, availability) still exist
 * and still drive the cards, the PDP, the cart and checkout; only the
 * filtering UI and logic went.
 *
 * Rules:
 * - Unknown values are ignored, never applied. A hand-edited URL can only ever
 *   produce a valid state. Legacy removed parameters (`style`, `tier`,
 *   `performance`, `size`, `available`, `season`) are not even read, so an old
 *   shared link still loads and simply does not filter by them.
 * - The serialised form is deterministic (fixed key order, no empty values), so
 *   the same view always has the same URL and a link never accumulates noise.
 * - Values are the catalogue's own Arabic labels (the data is the vocabulary).
 * - `form` (الصيغة) is NOT a visible group. It is parsed, applied and written
 *   back so the header's "زيوت عطرية" link (`/shop?form=زيت عطري`) keeps
 *   landing on oils; it never appears in the drawer, the chips or the counts.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { GENDERS, PRODUCT_FORMS } from "./product-vocabulary";
import { productForm } from "./card-presentation";
import { genderPublicLabel } from "./site-nav";

import type { SortOption } from "./sort-helpers";

// ─── Groups ─────────────────────────────────────────────────────────────────

/**
 * The visible filter groups, in URL order. Gender and the foda collection
 * are facets; `form` below is internal narrowing, not a group.
 */
export const FILTER_KEYS = ["gender", "foda"] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

/** Narrowing that is parsed/applied/serialised but never shown as a group. */
export const INTERNAL_FILTER_KEYS = ["form"] as const;

export type InternalFilterKey = (typeof INTERNAL_FILTER_KEYS)[number];

/** Every key the URL carries, in serialisation order. */
const ALL_KEYS = [...FILTER_KEYS, ...INTERNAL_FILTER_KEYS] as const;

type AnyKey = (typeof ALL_KEYS)[number];

/**
 * The single value of the "foda" facet — the foda-original collection. It is a
 * facet (not a toggle) so it inherits counts, chips and the empty-state hiding
 * of every other facet, and the group vanishes when no visible product carries
 * the flag. The label is rendered by `facetValueLabel`.
 */
export const FODA_FILTER_VALUE = "الأصلية" as const;

// ─── State ──────────────────────────────────────────────────────────────────

export interface CatalogState {
  gender: string[];
  /**
   * "عطر" / "زيت عطري" — internal only (the oils nav link). Parsed and
   * applied, but no group in the drawer offers it.
   */
  form: string[];
  /** "عطور فوده الأصلية" — the `fodaOriginal` flag, as a one-value facet. */
  foda: string[];
  sort: SortOption;
  q: string;
}

export const DEFAULT_SORT: SortOption = "default";

/** The URL state of an untouched catalogue. */
export const EMPTY_CATALOG_STATE: CatalogState = {
  gender: [],
  form: [],
  foda: [],
  sort: DEFAULT_SORT,
  q: "",
};

/** The vocabularies a value must belong to (one per key). */
const ALLOWED: Record<AnyKey, readonly string[]> = {
  gender: GENDERS,
  foda: [FODA_FILTER_VALUE],
  form: PRODUCT_FORMS,
};

const SORT_OPTIONS: readonly SortOption[] = ["default", "price-asc", "price-desc", "alphabetical"];

/** Longest search query we keep — a URL is not a text field. */
export const MAX_QUERY_LENGTH = 80;

export type CatalogSearchParams = Readonly<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function readList(params: CatalogSearchParams, key: AnyKey): string[] {
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
 * values are collapsed — a malformed link degrades to a working page. Removed
 * filter parameters (`style`, `tier`, `performance`, `size`, `available`,
 * `season`) are not read at all.
 */
export function parseCatalogState(params: CatalogSearchParams): CatalogState {
  const sortRaw = firstValue(params.sort).trim();
  const sort = SORT_OPTIONS.includes(sortRaw as SortOption)
    ? (sortRaw as SortOption)
    : DEFAULT_SORT;

  return {
    gender: readList(params, "gender"),
    form: readList(params, "form"),
    foda: readList(params, "foda"),
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

  for (const key of ALL_KEYS) {
    if ((omit as readonly AnyKey[]).includes(key)) continue;
    const values = state[key].filter((value) => value !== "");
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.q) params.set("q", state.q);

  return params.toString();
}

/** A catalogue URL for a state. */
export function catalogHref(state: CatalogState, basePath = "/shop"): string {
  const query = serializeCatalogState(state);
  return query ? `${basePath}?${query}` : basePath;
}

// ─── Transitions ────────────────────────────────────────────────────────────

/** Add or remove one value of a visible group. */
export function toggleFacetValue(state: CatalogState, key: FilterKey, value: string): CatalogState {
  const current = state[key];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return { ...state, [key]: next };
}

/** Drop one value of a visible group (a chip's ×). */
export function removeFacetValue(state: CatalogState, key: FilterKey, value: string): CatalogState {
  return { ...state, [key]: state[key].filter((entry) => entry !== value) };
}

export function setSort(state: CatalogState, sort: SortOption): CatalogState {
  return { ...state, sort };
}

export function setQuery(state: CatalogState, q: string): CatalogState {
  return { ...state, q: q.trim().slice(0, MAX_QUERY_LENGTH) };
}

/** Every filter (including the internal form narrowing) and the search cleared; the sort is preserved. */
export function clearCatalogFilters(state: CatalogState): CatalogState {
  return { ...EMPTY_CATALOG_STATE, sort: state.sort };
}

/** How many visible filter values are active (the internal form never counts). */
export function countActiveFilters(state: CatalogState, omit: readonly FilterKey[] = []): number {
  return FILTER_KEYS.reduce(
    (sum, key) => (omit.includes(key) ? sum : sum + state[key].length),
    0,
  );
}

/** True when nothing narrows the catalogue (the internal form included). */
export function isDefaultCatalogState(state: CatalogState): boolean {
  return countActiveFilters(state) === 0 && state.form.length === 0 && state.q === "";
}

// ─── Labels ─────────────────────────────────────────────────────────────────

/** Display label for one visible filter value. */
export function facetValueLabel(key: FilterKey, value: string): string {
  if (key === "gender") {
    return genderPublicLabel(value);
  }
  if (key === "foda") return "الأصلية فقط";
  return value;
}

/** The product field a visible facet compares against. */
export function productFacetValue(product: Product, key: FilterKey): string | null {
  if (key === "foda") return product.fodaOriginal ? FODA_FILTER_VALUE : null;
  return product.gender;
}

/** Whether a product matches the internal form narrowing (the oils link). */
export function matchesInternalForm(product: Product, form: readonly string[]): boolean {
  if (form.length === 0) return true;
  const productValue = productForm(product);
  return form.some((value) => value === productValue);
}
