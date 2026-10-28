/**
 * Related products — the row under a product page.
 *
 * "Similar" is a data question, not a marketing one: same gender and same
 * scent style, buyable today, visible, and not the product being viewed. The
 * order rewards catalogue proximity (same tier, then season, then performance)
 * and uses stable owner order/name as tie breakers.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { hasAnyStock } from "./card-presentation";
import { isComingSoon } from "./product-availability";

export const RELATED_LIMIT = 4;

/** How many products must qualify before the row is worth showing. */
export const RELATED_MINIMUM = 2;

export function selectRelatedProducts(
  product: Product,
  products: readonly Product[],
  limit: number = RELATED_LIMIT,
): Product[] {
  const matches = products.filter(
    (candidate) =>
      candidate.id !== product.id &&
      candidate.hidden !== true &&
      !isComingSoon(candidate) &&
      hasAnyStock(candidate) &&
      candidate.gender === product.gender &&
      candidate.type === product.type,
  );

  matches.sort((a, b) => {
    const closeness = (candidate: Product) =>
      Number(candidate.house === product.house) * 4 +
      Number(candidate.season === product.season) * 2 +
      Number(candidate.performance === product.performance);
    const score = closeness(b) - closeness(a);
    if (score !== 0) return score;
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return a.name.localeCompare(b.name, "ar");
  });

  return matches.slice(0, Math.max(0, limit));
}
