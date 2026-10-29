/**
 * Header search index — names, slugs and one public meta line.
 *
 * Pure and client-safe: the route serialises the result, the combobox filters
 * it. Nothing private is ever included: no price, no stock, no `house` value,
 * and no hidden product. The tier in the meta line goes through
 * PUBLIC_TIER_LABELS, so `دووب` cannot leak to a shopper.
 */

import type { Product } from "@/types";
import { publicTierLabel } from "./product-labels";

export interface SearchIndexItem {
  slug: string;
  name: string;
  /** "نيش · شرقي" — the public tier label, then the scent style. */
  meta: string;
}

export function buildSearchIndex(
  products: readonly Product[],
): SearchIndexItem[] {
  return products
    .filter((product) => product.hidden !== true)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      meta: [publicTierLabel(product.house), product.type]
        .filter(Boolean)
        .join(" · "),
    }));
}
