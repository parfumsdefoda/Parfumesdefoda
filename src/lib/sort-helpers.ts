import type { Product } from "@/types";

export type SortOption =
  | "best-selling"
  | "alphabetical"
  | "price-asc"
  | "price-desc";

/**
 * Sort products by the given option.
 * Returns a new sorted array (does not mutate).
 *
 * @param salesCounts Optional map of productId -> total quantity sold,
 *   used only by the "best-selling" option. When omitted (e.g. Redis fetch
 *   failed), "best-selling" falls back to the current array order.
 */
export function sortProducts(
  products: Product[],
  sortBy: SortOption,
  salesCounts?: Record<string, number>,
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case "best-selling": {
      // No sales data available — keep current array order unchanged.
      if (!salesCounts) return sorted;

      // Sort by sales count descending. Missing/0 counts sort last,
      // ties keep original array order (Array#sort is stable).
      return sorted.sort((a, b) => {
        const countA = salesCounts[a.id] ?? 0;
        const countB = salesCounts[b.id] ?? 0;
        return countB - countA;
      });
    }

    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    case "price-asc":
      return sorted.sort((a, b) => {
        const priceA = a.sizes[0]?.price ?? 0;
        const priceB = b.sizes[0]?.price ?? 0;
        return priceA - priceB;
      });

    case "price-desc":
      return sorted.sort((a, b) => {
        const priceA = a.sizes[0]?.price ?? 0;
        const priceB = b.sizes[0]?.price ?? 0;
        return priceB - priceA;
      });

    default:
      return sorted;
  }
}
