"use client";

import { useState, useMemo, useCallback } from "react";
import type { Product, ActiveFilters } from "@/types";
import type { SortOption } from "@/lib/sort-helpers";
import { filterProducts } from "@/lib/filter-helpers";
import { searchProducts } from "@/lib/search-helpers";
import { sortProducts } from "@/lib/sort-helpers";

export interface UseProductsReturn {
  /** All products from JSON */
  allProducts: Product[];
  /** Filtered, searched, sorted products */
  products: Product[];
  /** Whether products are still loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current active filters */
  activeFilters: ActiveFilters;
  /** Set all active filters */
  setActiveFilters: (filters: ActiveFilters) => void;
  /** Toggle a single filter */
  toggleFilter: (groupKey: string, slug: string) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Current sort option */
  sortBy: SortOption;
  /** Set sort option */
  setSortBy: (sort: SortOption) => void;
  /** Count of active filters */
  activeFilterCount: number;
  /** Whether any filters or search are active */
  hasActiveFilters: boolean;
}

/**
 * Main products hook.
 * Handles filtering, searching, and sorting.
 *
 * Data is pre-loaded by the Server Component and passed as initialProducts.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useProducts(initialProducts: Product[] = []): UseProductsReturn {
  const [allProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const toggleFilter = useCallback(
    (groupKey: string, slug: string) => {
      setActiveFilters((prev) => {
        const currentGroup = prev[groupKey] ?? [];
        const isActive = currentGroup.includes(slug);
        return {
          ...prev,
          [groupKey]: isActive
            ? currentGroup.filter((s) => s !== slug)
            : [...currentGroup, slug],
        };
      });
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setSearchQuery("");
  }, []);

  const products = useMemo(() => {
    let result = allProducts;

    // Filter
    result = filterProducts(result, activeFilters);

    // Search
    result = searchProducts(result, searchQuery);

    // Sort
    result = sortProducts(result, sortBy);

    return result;
  }, [allProducts, activeFilters, searchQuery, sortBy]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(activeFilters).reduce(
        (sum, slugs) => sum + slugs.length,
        0,
      ),
    [activeFilters],
  );

  const hasActiveFilters =
    activeFilterCount > 0 || searchQuery.trim().length > 0;

  return {
    allProducts,
    products,
    isLoading: false,
    error: null,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    toggleFilter,
    clearFilters,
    sortBy,
    setSortBy,
    activeFilterCount,
    hasActiveFilters,
  };
}
