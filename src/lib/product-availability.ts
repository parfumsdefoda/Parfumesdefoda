/**
 * Product availability helpers.
 *
 * Availability is a STATE (`inStock` / `status`), not a label. The catalogue
 * also carries free-text badges, and some simply repeat "غير متوفر حالياً" —
 * rendering that as a gold marketing badge tells shoppers the opposite of the
 * truth, so the badge is suppressed and the real state is used instead.
 *
 * The JSON text itself is owner data and is never rewritten here.
 */

/** The one shared placeholder every un-photographed product points at. */
export const PLACEHOLDER_IMAGE = "/products/placeholder-unavailable.webp";

/** True when a product still shows the shared "photo pending" image. */
export function isPlaceholderImage(image?: string | null): boolean {
  if (!image) return false;
  return image.split("?")[0].endsWith("placeholder-unavailable.webp");
}

/**
 * A product waiting for its real photo.
 *
 * It stays in the catalogue and on its own page, but it is not for sale yet:
 * no price, no size selector, no add-to-cart. The owner can hide it instead
 * with `on_site=لا` in data/product-master.csv.
 */
export function isComingSoon(product: { image?: string | null }): boolean {
  return isPlaceholderImage(product.image);
}

/** Badge texts that describe availability rather than a marketing claim. */
const UNAVAILABLE_BADGE_PATTERN =
  /غير\s*متوفر|غير\s*متاح|نفد|مباع|out\s*of\s*stock|unavailable|sold\s*out/i;

/** True when a badge string is really an availability notice. */
export function isUnavailableBadge(badge?: string | null): boolean {
  if (!badge) return false;
  return UNAVAILABLE_BADGE_PATTERN.test(badge);
}

/**
 * True when the product as a whole cannot be bought: explicitly out of stock,
 * or marked with a non-active status.
 */
export function isUnavailableProduct(product: {
  inStock?: boolean;
  status?: string;
}): boolean {
  if (product.inStock === false) return true;
  if (product.status && product.status !== "active") return true;
  return false;
}
