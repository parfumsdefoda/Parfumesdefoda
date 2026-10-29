/**
 * Related products — the row under a product page.
 *
 * Two sources, in this order:
 * 1. Explicit links from the master (`is_similar`). The relation is MUTUAL at
 *    read time: a link counts whether it was written on this product or on the
 *    other one, so the data never has to carry both directions.
 * 2. The catalogue's own closeness (same gender + scent style, then same tier,
 *    season and performance), which fills the row up to four.
 *
 * A product with nothing in stock gets "بدائل مشابهة": the row is still useful,
 * the shopper just cannot buy the product being viewed.
 *
 * Everything here is pure and client-safe.
 */

import type { Product } from "@/types";
import { hasAnyStock } from "./card-presentation";
import { isComingSoon } from "./product-availability";

export const RELATED_LIMIT = 4;

/** How many products must qualify before the row is worth showing. */
export const RELATED_MINIMUM = 2;

export type RelatedVariant = "related" | "alternatives";

export interface RelatedSelection {
  products: Product[];
  /**
   * `related` when the viewed product is buyable, `alternatives` when it has no
   * purchasable size (the heading changes and the row is a way out).
   */
  variant: RelatedVariant;
}

/** True when a shopper can buy the product itself today. */
export function isPurchasable(product: Product): boolean {
  return (
    product.hidden !== true && !isComingSoon(product) && hasAnyStock(product)
  );
}

/**
 * Explicit similar products, unioned in both directions.
 *
 * The viewed product's own order wins; back-links from other rows follow in
 * catalogue order. Hidden / sold-out filtering is the caller's job.
 */
export function getSimilarProducts(
  product: Product,
  catalogue: readonly Product[],
): Product[] {
  const bySlug = new Map(catalogue.map((candidate) => [candidate.slug, candidate]));
  const ordered: Product[] = [];
  const seen = new Set<string>([product.slug]);

  for (const slug of product.similarTo ?? []) {
    const match = bySlug.get(slug);
    if (!match || seen.has(match.slug)) continue;
    seen.add(match.slug);
    ordered.push(match);
  }

  for (const candidate of catalogue) {
    if (seen.has(candidate.slug)) continue;
    if (!(candidate.similarTo ?? []).includes(product.slug)) continue;
    if (candidate.hidden === true) continue;
    seen.add(candidate.slug);
    ordered.push(candidate);
  }

  return ordered;
}

export function selectRelatedProducts(
  product: Product,
  products: readonly Product[],
  limit: number = RELATED_LIMIT,
): RelatedSelection {
  const buyable = (candidate: Product) =>
    candidate.id !== product.id &&
    candidate.hidden !== true &&
    !isComingSoon(candidate) &&
    hasAnyStock(candidate);

  const explicit = getSimilarProducts(product, products).filter(buyable);
  const explicitIds = new Set(explicit.map((candidate) => candidate.id));

  const fallback = products.filter(
    (candidate) =>
      buyable(candidate) &&
      !explicitIds.has(candidate.id) &&
      candidate.gender === product.gender &&
      candidate.type === product.type,
  );

  fallback.sort((a, b) => {
    const closeness = (candidate: Product) =>
      Number(candidate.house === product.house) * 4 +
      Number(
        candidate.season !== undefined &&
          product.season !== undefined &&
          candidate.season === product.season,
      ) *
        2 +
      Number(candidate.performance === product.performance);
    const score = closeness(b) - closeness(a);
    if (score !== 0) return score;
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return a.name.localeCompare(b.name, "ar");
  });

  return {
    products: [...explicit, ...fallback].slice(0, Math.max(0, limit)),
    variant: isPurchasable(product) ? "related" : "alternatives",
  };
}
