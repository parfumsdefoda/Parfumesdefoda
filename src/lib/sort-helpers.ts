import type { Product } from "@/types";
import { lowestBuyablePrice } from "./card-presentation";

/**
 * How the catalogue can be ordered.
 *
 * The default order is the owner's catalogue order. The premium (فاخر)
 * classification never sorts: a legacy `?sort=featured` value is silently
 * ignored by the parser and lands on the default instead.
 */
export type SortOption =
  | "default"
  | "price-asc"
  | "price-desc"
  | "alphabetical";

/** A product without sizes sorts as if it were the most expensive one. */
const NO_PRICE = Number.POSITIVE_INFINITY;

const priceOf = (product: Product) => lowestBuyablePrice(product) ?? NO_PRICE;

/**
 * Sort products by the given option.
 *
 * Returns a new sorted array (does not mutate) and keeps the incoming order for
 * ties — `Array#sort` is stable, so the catalogue order survives every sort.
 * Prices compare the cheapest size a shopper can actually buy, which is the
 * number printed on the card.
 */
export function sortProducts(
  products: Product[],
  sortBy: SortOption,
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case "price-asc":
      return sorted.sort((a, b) => priceOf(a) - priceOf(b));

    case "price-desc":
      return sorted.sort((a, b) => {
        const aPrice = priceOf(a);
        const bPrice = priceOf(b);
        // Products without a price stay at the end in both directions.
        if (aPrice === bPrice) return 0;
        if (aPrice === NO_PRICE) return 1;
        if (bPrice === NO_PRICE) return -1;
        return bPrice - aPrice;
      });

    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    default:
      return sorted;
  }
}
