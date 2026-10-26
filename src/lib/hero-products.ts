/**
 * Hero products — which three bottles the homepage composition shows.
 *
 * The hero is built from the catalogue itself, so it can never show a bottle
 * the store does not sell: no photography is invented, no product is promoted
 * that a shopper could not buy.
 *
 * Rules, in order:
 * 1. Only products that are visible, buyable and photographed on a cut-out
 *    (the derived image has real alpha, `blend: "normal"`) are candidates.
 *    A `multiply` cut-out is a white rectangle on the purple section.
 * 2. If the owner listed `settings.heroProducts`, that order wins.
 * 3. Otherwise: featured products, ordered by the cached sales counts, then by
 *    slug — deterministic, so the same data always renders the same hero.
 * 4. Fewer than three candidates means one centred bottle, not a lopsided trio.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { hasAnyStock } from "./card-presentation";
import { getProductImageEntry } from "./product-image";
import { isComingSoon } from "./product-availability";

/** The composition is built for three bottles: one centre, two flanking. */
export const HERO_PRODUCT_LIMIT = 3;

/** True when the derived image can sit directly on the purple section. */
export function hasCutoutPhoto(product: Product): boolean {
  const entry = getProductImageEntry(product.slug);
  return entry?.blend === "normal" && entry.background === "transparent";
}

/** Visible, buyable, photographed — the only products the hero may show. */
function isEligible(product: Product): boolean {
  return (
    product.hidden !== true &&
    !isComingSoon(product) &&
    hasAnyStock(product) &&
    hasCutoutPhoto(product)
  );
}

function soldCount(counts: Record<string, number>, product: Product): number {
  const value = counts[product.id] ?? counts[product.sku] ?? 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The hero bottles, centre first.
 *
 * Returns one product when only one qualifies, and an empty array when none
 * does (the hero then renders copy only — never a placeholder bottle).
 */
export function selectHeroProducts(
  products: readonly Product[],
  counts: Record<string, number> = {},
  preferred: readonly string[] = [],
): Product[] {
  const eligible = products.filter(isEligible);
  if (eligible.length === 0) return [];

  const bySlug = new Map(eligible.map((product) => [product.slug, product]));
  const pinned = preferred
    .map((slug) => bySlug.get(slug))
    .filter((product): product is Product => product !== undefined);

  const ranked =
    pinned.length > 0
      ? pinned
      : [...eligible]
          .filter((product) => product.featured === true)
          .sort((a, b) => {
            const bySales = soldCount(counts, b) - soldCount(counts, a);
            if (bySales !== 0) return bySales;
            return a.slug.localeCompare(b.slug);
          });

  if (ranked.length < HERO_PRODUCT_LIMIT) return ranked.slice(0, 1);
  return ranked.slice(0, HERO_PRODUCT_LIMIT);
}
