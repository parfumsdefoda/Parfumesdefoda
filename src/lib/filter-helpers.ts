import type { Product } from "@/types";
import type { ActiveFilters } from "@/types";

/**
 * Filter products by multiple active filter groups.
 * A product matches if it satisfies at least one filter within each group.
 * If a group has no active filters, it is skipped.
 */
export function filterProducts(
  products: Product[],
  activeFilters: ActiveFilters,
): Product[] {
  const activeGroups = Object.entries(activeFilters).filter(
    ([, slugs]) => slugs.length > 0,
  );

  if (activeGroups.length === 0) return products;

  return products.filter((product) =>
    activeGroups.every(([, slugs]) =>
      slugs.some(
        (slug) =>
          product.categories.includes(slug) ||
          product.gender === slug ||
          product.badge === slug,
      ),
    ),
  );
}

/**
 * Toggle a filter slug within a group.
 * Returns a new ActiveFilters object.
 */
export function toggleFilter(
  current: ActiveFilters,
  groupKey: string,
  slug: string,
): ActiveFilters {
  const currentGroup = current[groupKey] ?? [];
  const isActive = currentGroup.includes(slug);

  return {
    ...current,
    [groupKey]: isActive
      ? currentGroup.filter((s) => s !== slug)
      : [...currentGroup, slug],
  };
}

/**
 * Count the total number of active filters across all groups.
 */
export function countActiveFilters(activeFilters: ActiveFilters): number {
  return Object.values(activeFilters).reduce(
    (sum, slugs) => sum + slugs.length,
    0,
  );
}
