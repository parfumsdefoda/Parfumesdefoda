/**
 * Best sellers — the homepage's product row.
 *
 * Order comes from the sales counts the order route maintains, but the counts
 * are decoration: if Redis is unconfigured, slow or empty, the row falls back
 * to the catalogue's own featured flag and sort order. Nothing here invents a
 * count, and a product the owner hid or has not photographed is never shown.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { isComingSoon } from "./product-availability";
import { hasAnyStock } from "./card-presentation";

export const BEST_SELLER_LIMIT = 8;

function soldCount(counts: Record<string, number>, product: Product): number {
  const value = counts[product.id] ?? counts[product.sku] ?? 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The row's products, best-selling first.
 *
 * Ties are broken by featured, then by the owner's sortOrder, then by name —
 * all stable, so an empty counts object simply yields the featured-first view.
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

    const featured = Number(b.featured ?? false) - Number(a.featured ?? false);
    if (featured !== 0) return featured;

    const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (byOrder !== 0) return byOrder;

    return a.name.localeCompare(b.name, "ar");
  });

  return ranked.slice(0, Math.max(0, limit));
}
