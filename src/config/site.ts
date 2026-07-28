/**
 * Site configuration.
 *
 * Most values are loaded from JSON files at runtime.
 * This file only contains build-time constants.
 */

import { SITE_NAME, SITE_URL, GRID_COLUMNS, BREAKPOINTS } from "./constants";

export const SITE = {
  name: SITE_NAME,
  url: SITE_URL,
  locale: "ar_AR",
  direction: "rtl" as const,
  language: "ar" as const,
} as const;

export const GRID = {
  desktop: GRID_COLUMNS.DESKTOP,
  tablet: GRID_COLUMNS.TABLET,
  mobile: GRID_COLUMNS.MOBILE,
} as const;

export const BREAKPOINTS_EXPORT = {
  desktop: BREAKPOINTS.DESKTOP,
  tablet: BREAKPOINTS.TABLET,
} as const;
