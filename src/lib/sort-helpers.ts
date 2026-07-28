import type { Product } from "@/types";

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "alphabetical"
  | "featured";

/**
 * Sort products by the given option.
 * Returns a new sorted array (does not mutate).
 */
export function sortProducts(
  products: Product[],
  sortBy: SortOption,
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

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

    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    case "featured":
      return sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });

    default:
      return sorted;
  }
}
