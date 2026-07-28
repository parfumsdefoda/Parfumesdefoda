"use client";

import { useMemo } from "react";
import type { FilterOption } from "@/types";
import type { FilterData } from "@/types/services";

/**
 * Build filter groups from filter data + products.
 * Groups filters by their "group" field.
 */
function buildFilterGroups(
  filters: FilterOption[],
  groups: Record<string, FilterOption[]>,
): { name: string; options: FilterOption[] }[] {
  const result: { name: string; options: FilterOption[] }[] = [];
  for (const [name, options] of Object.entries(groups)) {
    result.push({ name, options });
  }
  return result;
}

export interface UseFiltersReturn {
  /** Filter groups for the sidebar */
  filterGroups: { name: string; options: FilterOption[] }[];
  /** All available filter options */
  allFilters: FilterOption[];
  /** Whether filters are loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

const defaultFilterData: FilterData = {
  filters: [],
  categories: [],
  badges: [],
  genders: [],
  types: [],
};

/**
 * Hook for consuming filter data.
 *
 * Data is pre-loaded by the Server Component and passed as initialFilterData.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useFilters(
  initialFilterData: FilterData = defaultFilterData,
): UseFiltersReturn {
  const filterGroups = useMemo(() => {
    // Group filters by their "group" field
    const grouped: Record<string, FilterOption[]> = {};
    for (const filter of initialFilterData.filters) {
      const groupName = filter.group ?? "other";
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(filter);
    }

    return buildFilterGroups(initialFilterData.filters, grouped);
  }, [initialFilterData]);

  return {
    filterGroups,
    allFilters: initialFilterData.filters,
    isLoading: false,
    error: null,
  };
}
