import type { FilterData } from "@/types/services";
import type { FilterOption } from "@/types";
import { readJsonFile } from "@/lib/json-loader";

// Re-export type for backward compatibility
export type { FilterData } from "@/types/services";

/**
 * Load all filter-related data using server-side file reading.
 * Derives filter groups from data/filters.json, categories.json, and badges.json.
 */
export async function loadFilterData(): Promise<FilterData> {
  const defaults: FilterData = {
    filters: [],
    categories: [],
    badges: [],
    genders: [],
    types: [],
  };

  try {
    const [filters, categories, badges] = await Promise.all([
      readJsonFile<unknown>("data/filters.json", []),
      readJsonFile<unknown>("data/categories.json", []),
      readJsonFile<unknown>("data/badges.json", []),
    ]);

    const filterList = Array.isArray(filters)
      ? filters.map((f: FilterOption) => ({
          slug: f.slug,
          label: f.label,
          group: f.group,
        }))
      : [];

    const categoryList = Array.isArray(categories)
      ? categories.map((c: string | { name?: string; slug?: string }) =>
          typeof c === "string" ? c : c.name ?? c.slug ?? "",
        )
      : [];

    const badgeList = Array.isArray(badges)
      ? badges.map(
          (b: { slug?: string; label?: string }) => b.label ?? b.slug ?? "",
        )
      : [];

    const genderFilters = filterList
      .filter((f) => f.group === "الجنس")
      .map((f) => f.label);
    const typeFilters = filterList
      .filter((f) => f.group === "النوع" || f.group === "الفئة")
      .map((f) => f.label);

    return {
      filters: filterList,
      categories: categoryList,
      badges: badgeList,
      genders: genderFilters,
      types: typeFilters,
    };
  } catch {
    return defaults;
  }
}
