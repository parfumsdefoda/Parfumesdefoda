/**
 * Hero showcase selection (pure, server-safe).
 *
 * Builds the randomized product set for the animated hero marquee on each
 * page load: all فاخر (featured) products come first (shuffled), then random
 * non-featured products fill the rest — the premium feel first, variety after.
 * Pure function: no fs, no fetch — safe to import anywhere.
 */

import type { Product } from "@/schemas/product-schema";

export interface HeroShowcaseItem {
  id: string;
  /** Product slug — used for the clickable link to the product page */
  slug: string;
  name: string;
  image: string;
  /** فاخر (featured) products get the gold frame treatment in the marquee */
  featured: boolean;
}

/** Fisher–Yates shuffle (returns a new array, input untouched). */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select up to `total` products for the hero marquee.
 * Order: shuffled featured first, then shuffled regular products.
 */
export function selectHeroShowcase(
  products: Product[],
  total = 12,
): HeroShowcaseItem[] {
  const active = products.filter((p) => p.status === "active");
  const featured = shuffle(active.filter((p) => p.featured));
  const regular = shuffle(active.filter((p) => !p.featured));

  return [...featured, ...regular]
    .slice(0, total)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image: p.image,
      featured: p.featured,
    }));
}