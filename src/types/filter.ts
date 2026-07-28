/**
 * Filter types — used by filters feature.
 */
export interface FilterOption {
  slug: string;
  label: string;
  group?: string;
}

export interface FilterGroup {
  name: string;
  options: FilterOption[];
}

export type ActiveFilters = Record<string, string[]>;
