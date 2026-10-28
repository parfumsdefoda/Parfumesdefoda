/**
 * Catalogue query — filtering, facet counts and ordering.
 *
 * The server renders the grid from this module, so everything here is pure and
 * runs once per request. Facet counts follow the standard rule: an option's
 * count is computed against every OTHER active filter, so the numbers tell the
 * shopper what would happen if they added that option rather than echoing the
 * current result set.
 */

import type { Product } from "@/types";
import {
  GENDERS,
  PERFORMANCES,
  PRODUCT_FORMS,
  PRODUCT_TYPES,
  SEASONS,
} from "./product-vocabulary";
import {
  FILTER_KEYS,
  FILTERABLE_TIERS,
  facetValueLabel,
  productFacetValue,
  type CatalogState,
  type FilterKey,
} from "./catalog-filters";
import { hasAnyStock, sizeMlFromLabel } from "./card-presentation";
import { orderForCatalog } from "./catalog-order";
import { isUnavailableProduct } from "./product-availability";
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

/**
 * Every buyable bottle volume in the catalogue, smallest first.
 *
 * Derived from the products, so an oil's 3/6/12 مل appears the moment it is in
 * stock — no constant to edit, and a sold-out volume is not offered as a dead
 * end. Labels come from the data ("12 مل"), never rebuilt by hand.
 */
export function catalogueSizeLabels(products: Product[]): string[] {
  const byVolume = new Map<number, string>();
  for (const product of products) {
    for (const size of product.sizes) {
      if (!size.inStock) continue;
      const ml = sizeMlFromLabel(size.label);
      if (ml === null) continue;
      if (!byVolume.has(ml)) byVolume.set(ml, size.label);
    }
  }
  return [...byVolume.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, label]) => label);
}

/** The catalogue's option vocabulary per group. */
function optionValues(products: Product[], key: FilterKey): string[] {
  switch (key) {
    case "gender":
      return [...GENDERS];
    case "style":
      return [...PRODUCT_TYPES];
    case "form":
      return [...PRODUCT_FORMS];
    case "tier":
      return [...FILTERABLE_TIERS];
    case "season":
      return [...SEASONS];
    case "performance":
      return [...PERFORMANCES];
    case "size":
      return catalogueSizeLabels(products);
    default:
      return [];
  }
}

/** True when a product matches one value of one group. */
export function matchesFacetValue(
  product: Product,
  key: FilterKey,
  value: string,
): boolean {
  if (key === "size") {
    // Availability-based: the size has to be one a shopper can actually buy
    // today, so a sold-out size never matches its own filter.
    return product.sizes.some(
      (size) => size.label === value && size.inStock,
    );
  }
  const field = productFacetValue(product, key);
  return field !== null && field === value;
}

/**
 * Does the product survive the whole state?
 *
 * `except` leaves one group (or the availability toggle) out, which is exactly
 * how facet counts are computed.
 */
export function productMatchesState(
  product: Product,
  state: CatalogState,
  except?: FilterKey | "available",
): boolean {
  if (state.q && !productMatchesQuery(product, state.q)) return false;

  if (
    except !== "available" &&
    state.available &&
    (isUnavailableProduct(product) || !hasAnyStock(product))
  ) {
    return false;
  }

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
export function filterCatalog(
  products: Product[],
  state: CatalogState,
): Product[] {
  return products.filter((product) => productMatchesState(product, state));
}

// ─── Facets ─────────────────────────────────────────────────────────────────

/** Option values that exist anywhere in the catalogue, so nothing is a dead end. */
function presentOptions(products: Product[], key: FilterKey): string[] {
  return optionValues(products, key).filter((value) =>
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
      const pool = products.filter((product) =>
        productMatchesState(product, state, key),
      );

      return {
        key,
        options: presentOptions(products, key).map((value) => ({
          value,
          // Tier labels go through PUBLIC_TIER_LABELS, so `دووب` is not an
          // option at all; every other label is the catalogue's own value.
          label: facetValueLabel(key, value),
          count: pool.filter((product) => matchesFacetValue(product, key, value))
            .length,
        })),
      };
    })
    // "الصيغة" is only a real choice when both formats are sold; a one-option
    // group wastes a tap and looks like a bug.
    .filter((group) => group.options.length > (group.key === "form" ? 1 : 0));
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
