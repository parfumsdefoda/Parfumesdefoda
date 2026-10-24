/**
 * Catalogue ordering — availability outranks the shopper's chosen sort.
 *
 * A sold-out product never leads a row, and a product whose photo has not been
 * taken yet never appears above something a shopper can buy today. Within each
 * group the incoming order is preserved (every step below is stable), so the
 * chosen sort still decides everything it can.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { isComingSoon, isUnavailableProduct } from "./product-availability";
import { hasAnyStock } from "./card-presentation";

export type AvailabilityRank = 0 | 1 | 2;

/**
 * 0 = buyable now, 1 = sold out, 2 = not photographed yet.
 * The photo state wins: a placeholder is not merely sold out.
 */
export function availabilityRank(
  product: Pick<Product, "image" | "inStock" | "status" | "sizes">,
): AvailabilityRank {
  if (isComingSoon(product)) return 2;
  if (isUnavailableProduct(product) || !hasAnyStock(product)) return 1;
  return 0;
}

/**
 * Reorder a catalogue so buyable products come first, then sold out, then
 * coming soon — without disturbing the order inside each group.
 */
export function orderForCatalog(
  products: Product[],
): Product[] {
  return [...products].sort(
    (a, b) => availabilityRank(a) - availabilityRank(b),
  );
}
