/**
 * Homepage selection — the first products under the header.
 *
 * In stock only. Order is the cached sales counts the order route maintains
 * when they exist; otherwise the owner's master order (sortOrder, then name).
 * The premium (فاخر) classification never ranks a product. Nothing here
 * invents a count, and a product the owner hid or has not photographed is
 * never shown.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { isComingSoon } from "./product-availability";
import { hasAnyStock } from "./card-presentation";

export const BEST_SELLER_LIMIT = 12;

function soldCount(counts: Record<string, number>, product: Product): number {
  const value = counts[product.id] ?? counts[product.sku] ?? 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The homepage's products, best-selling first when any counts exist.
 *
 * Ties are broken by the owner's sortOrder, then by name — all stable, so an
 * empty counts object simply yields the master order.
 */
export function selectBestSellers(
  products: readonly Product[],
  counts: Record<string, number> = {},
  limit: number = BEST_SELLER_LIMIT,
): Product[] {
  const eligible = products.filter(
    (product) =>
      product.hidden !== true && !isComingSoon(product) && hasAnyStock(product),
  );

  const ranked = [...eligible].sort((a, b) => {
    const bySales = soldCount(counts, b) - soldCount(counts, a);
    if (bySales !== 0) return bySales;

    const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (byOrder !== 0) return byOrder;

    return a.name.localeCompare(b.name, "ar");
  });

  return ranked.slice(0, Math.max(0, limit));
}
