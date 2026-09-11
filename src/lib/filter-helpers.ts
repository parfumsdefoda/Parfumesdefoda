import type { Product } from "@/types";
import type { ActiveFilters } from "@/types";

/**
 * Maps a filter group name to the product field it filters against.
 *
 * NOTE: the season filter group is intentionally absent — it was removed from
 * the sidebar (see data/filters.json). The `season` field still exists on
 * products for search/sort/display; it is simply no longer filterable.
 */
const GROUP_TO_FIELD: Record<string, keyof Product> = {
  الجنس: "gender",
  النوع: "type",
  الدار: "house",
  الأداء: "performance",
};

/** Boolean checkbox group — any active slug means `oily === true` only. */
const OILY_GROUP = "عطور زيتية";

/** Boolean checkbox group — any active slug means `fodaOriginal === true` only. */
const FODA_ORIGINAL_GROUP = "فوده";

/** Boolean checkbox group — any active slug means `featured === true` only. */
const FEATURED_GROUP = "فاخر";

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
    activeGroups.every(([group, slugs]) => {
      // "عطور زيتية" is a single boolean checkbox → oily products only
      if (group === OILY_GROUP) {
        return product.oily === true;
      }

      // "فوده" is a single boolean checkbox → original Foda products only
      if (group === FODA_ORIGINAL_GROUP) {
        return product.fodaOriginal === true;
      }

      // "فاخر" is a single boolean checkbox → featured products only
      if (group === FEATURED_GROUP) {
        return product.featured === true;
      }

      const field = GROUP_TO_FIELD[group];
      if (!field) return true; // unknown group (e.g. sort) — ignore

      const value = product[field];
      return typeof value === "string" && slugs.includes(value);
    }),
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
