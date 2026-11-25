/**
 * Catalogue query — filtering, facet counts and ordering.
 *
 * The server renders the grid from this module, so everything here is pure and
 * runs once per request. Facet counts follow the standard rule: an option's
 * count is computed against every OTHER active filter, so the numbers tell the
 * shopper what would happen if they added that option rather than echoing the
 * current result set.
 *
 * The visible facets are gender (الجنس) and the foda-original collection
 * (عطور فوده الأصلية). The internal form narrowing (الصيغة, for the oils nav
 * link) is applied to every count but is not itself a facet. Products are
 * never hidden for being out of stock — they sort last and carry the
 * "غير متوفر" state on their card.
 */

import type { Product } from "@/types";
import { GENDERS } from "./product-vocabulary";
import {
  FILTER_KEYS,
  FODA_FILTER_VALUE,
  facetValueLabel,
  matchesInternalForm,
  productFacetValue,
  type CatalogState,
  type FilterKey,
} from "./catalog-filters";
import { orderForCatalog } from "./catalog-order";
import { productMatchesQuery } from "./search-helpers";
import { sortProducts } from "./sort-helpers";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FacetOption {
  value: string;
  label: string;
  /** How many products this option would add to the current view. */
  count: number;
}

export interface FacetGroup {
  key: FilterKey;
  options: FacetOption[];
}

export interface CatalogView {
  state: CatalogState;
  /** The filtered, sorted, availability-ordered products. */
  products: Product[];
  facets: FacetGroup[];
  /** Size of the current result set. */
  total: number;
  /** Goods in the whole (unfiltered) catalogue. */
  catalogueSize: number;
}

// ─── Matching ───────────────────────────────────────────────────────────────

/** The catalogue's option vocabulary per visible group. */
function optionValues(key: FilterKey): string[] {
  switch (key) {
    case "gender":
      return [...GENDERS];
    case "foda":
      // A one-value group: `presentOptions` keeps it only while a visible
      // product actually carries the flag, so the group is never a dead end.
      return [FODA_FILTER_VALUE];
    default:
      return [];
  }
}

/** True when a product matches one value of one visible group. */
export function matchesFacetValue(product: Product, key: FilterKey, value: string): boolean {
  const field = productFacetValue(product, key);
  return field !== null && field === value;
}

/**
 * Does the product survive the whole state?
 *
 * The internal form narrowing always applies (it has no facet of its own, so
 * there is no `except` for it). `except` leaves one visible group out, which
 * is exactly how facet counts are computed.
 */
export function productMatchesState(
  product: Product,
  state: CatalogState,
  except?: FilterKey,
): boolean {
  if (state.q && !productMatchesQuery(product, state.q)) return false;
  if (!matchesInternalForm(product, state.form)) return false;

  for (const key of FILTER_KEYS) {
    if (key === except) continue;
    const values = state[key];
    if (values.length === 0) continue;
    if (!values.some((value) => matchesFacetValue(product, key, value))) {
      return false;
    }
  }

  return true;
}

/** The products matching every active filter and the query. */
export function filterCatalog(products: Product[], state: CatalogState): Product[] {
  return products.filter((product) => productMatchesState(product, state));
}

// ─── Facets ─────────────────────────────────────────────────────────────────

/** Option values that exist anywhere in the catalogue, so nothing is a dead end. */
function presentOptions(products: Product[], key: FilterKey): string[] {
  return optionValues(key).filter((value) =>
    products.some((product) => matchesFacetValue(product, key, value)),
  );
}

/**
 * Counted facet groups.
 *
 * The option list comes from the whole catalogue (an option never disappears
 * because a different group is active), while each count is computed with that
 * group removed from the state — the "what if I add this too" number.
 */
export function buildFacets(
  products: Product[],
  state: CatalogState,
  /** Groups the page has locked, e.g. gender on `/shop/men`. */
  hidden: readonly FilterKey[] = [],
): FacetGroup[] {
  return FILTER_KEYS.filter((key) => !hidden.includes(key))
    .map((key) => {
      const pool = products.filter((product) => productMatchesState(product, state, key));

      return {
        key,
        options: presentOptions(products, key).map((value) => ({
          value,
          label: facetValueLabel(key, value),
          count: pool.filter((product) => matchesFacetValue(product, key, value)).length,
        })),
      };
    })
    // A group with no option at all (the foda collection when no visible
    // product carries the flag) is not offered — never a dead end.
    .filter((group) => group.options.length > 0);
}

// ─── View ───────────────────────────────────────────────────────────────────

/**
 * Everything the catalogue section needs, computed once per request:
 * the result set, the facet counts and the two numbers the UI announces.
 */
export function buildCatalogView(
  products: Product[],
  state: CatalogState,
  /** Facet groups the page does not offer (a category locks its gender). */
  hiddenFacets: readonly FilterKey[] = [],
): CatalogView {
  const filtered = filterCatalog(products, state);
  const sorted = orderForCatalog(sortProducts(filtered, state.sort));

  return {
    state,
    products: sorted,
    facets: buildFacets(products, state, hiddenFacets),
    total: sorted.length,
    catalogueSize: products.length,
  };
}
