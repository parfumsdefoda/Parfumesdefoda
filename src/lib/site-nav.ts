/**
 * Site navigation — the one place the three category routes are defined.
 *
 * A category is a locked gender view of the same catalogue, so the mapping from
 * URL slug (`/shop/men`) to the value stored in `data/products.json`
 * (`رجالي`) lives here and nowhere else. The header, the footer, the category
 * pages and the sitemap all read it.
 */

import { PRODUCT_FORMS } from "./product-vocabulary";

export type CategorySlug = "men" | "women" | "unisex";

export interface CategoryRoute {
  slug: CategorySlug;
  /** The `gender` value in data/products.json this route locks to. */
  gender: string;
}

export const CATEGORY_ROUTES: readonly CategoryRoute[] = [
  { slug: "men", gender: "رجالي" },
  { slug: "women", gender: "نسائي" },
  { slug: "unisex", gender: "للجنسين" },
] as const;

/** Single customer-facing label lookup for stored gender enum values. */
export const GENDER_PUBLIC_LABELS: Readonly<Record<string, string>> = {
  رجالي: "رجالي",
  نسائي: "حريمي",
  للجنسين: "للجنسين",
};

export function genderPublicLabel(gender: string): string {
  return GENDER_PUBLIC_LABELS[gender] ?? gender;
}

/** Resolve a URL slug to its route, or `undefined` for anything else (404). */
export function categoryBySlug(slug: string): CategoryRoute | undefined {
  return CATEGORY_ROUTES.find((route) => route.slug === slug);
}

/** The canonical path of a category. */
export function categoryHref(slug: CategorySlug): string {
  return `/shop/${slug}`;
}

/** How many visible products each gender holds. */
export function genderCounts(products: readonly { gender: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const product of products) {
    counts[product.gender] = (counts[product.gender] ?? 0) + 1;
  }
  return counts;
}

export interface NavLink {
  label: string;
  href: string;
}

export type PrimaryNavLabels = Record<"shop" | CategorySlug, string> & {
  /** Only shown when the catalogue actually has a visible oil product. */
  oils?: string;
};

/** The attar format — the value the oils link filters on. */
export const OIL_FORM = PRODUCT_FORMS[1];

/** Which optional groups the catalogue can actually fill. */
export interface PrimaryNavOptions {
  /** True when at least one visible product is an attar (oil). */
  hasOil?: boolean;
}

/**
 * The header's primary links.
 *
 * A category with no visible products is dropped rather than linked to an empty
 * page — the count comes from the same filtered product list the catalogue uses.
 * "زيوت عطرية" is only offered when an oil product exists, so it is never a
 * dead end.
 */
export function buildPrimaryNav(
  counts: Record<string, number>,
  labels: PrimaryNavLabels,
  options: PrimaryNavOptions = {},
): NavLink[] {
  const links: NavLink[] = [{ label: labels.shop, href: "/shop" }];
  for (const route of CATEGORY_ROUTES) {
    if ((counts[route.gender] ?? 0) === 0) continue;
    links.push({
      label: route.slug === "women" ? genderPublicLabel(route.gender) : labels[route.slug],
      href: categoryHref(route.slug),
    });
  }
  if (options.hasOil && labels.oils) {
    links.push({
      label: labels.oils,
      // The filter value, not an English slug: `?form=oil` was silently dropped
      // by the parser, so "زيوت عطرية" used to open the unfiltered catalogue.
      href: `/shop?form=${encodeURIComponent(OIL_FORM)}`,
    });
  }
  return links;
}
