/**
 * Site navigation — the one place the three category routes are defined.
 *
 * A category is a locked gender view of the same catalogue, so the mapping from
 * URL slug (`/shop/men`) to the value stored in `data/products.json`
 * (`رجالي`) lives here and nowhere else. The header, the footer, the category
 * pages and the sitemap all read it.
 */

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

/** Resolve a URL slug to its route, or `undefined` for anything else (404). */
export function categoryBySlug(slug: string): CategoryRoute | undefined {
  return CATEGORY_ROUTES.find((route) => route.slug === slug);
}

/** The canonical path of a category. */
export function categoryHref(slug: CategorySlug): string {
  return `/shop/${slug}`;
}

/** How many visible products each gender holds. */
export function genderCounts(
  products: readonly { gender: string }[],
): Record<string, number> {
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

export type PrimaryNavLabels = Record<"shop" | CategorySlug, string>;

/**
 * The header's primary links.
 *
 * A category with no visible products is dropped rather than linked to an empty
 * page — the count comes from the same filtered product list the catalogue uses.
 */
export function buildPrimaryNav(
  counts: Record<string, number>,
  labels: PrimaryNavLabels,
): NavLink[] {
  const links: NavLink[] = [{ label: labels.shop, href: "/shop" }];
  for (const route of CATEGORY_ROUTES) {
    if ((counts[route.gender] ?? 0) === 0) continue;
    links.push({ label: labels[route.slug], href: categoryHref(route.slug) });
  }
  return links;
}
