import type { Product } from "@/types";
import { lowestBuyablePrice } from "./card-presentation";

/**
 * How the catalogue can be ordered.
 *
 * `featured` replaces the old sales-count sort: the homepage no longer waits on
 * Redis to render, and "الافتراضي" should mean the owner's lineup (فاخر first,
 * then the catalogue order), not a number nobody can see.
 */
export type SortOption =
  | "featured"
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
    case "featured":
      return sorted.sort(
        (a, b) => Number(b.featured) - Number(a.featured),
      );

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
