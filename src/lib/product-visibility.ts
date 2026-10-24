/**
 * Product visibility — `on_site=لا` in the product master.
 *
 * A hidden product stays in `data/products.json` (so its data and photos are
 * not lost, and `on_site=نعم` brings it back) but it is excluded from every
 * list, search, sitemap and chat recommendation, and its own URL returns 404.
 *
 * Pure and client-safe: no `node:fs`, no service imports.
 */

/** True when the owner took the product off the site. */
export function isHidden(product: { hidden?: boolean }): boolean {
  return product.hidden === true;
}

/** The catalogue minus hidden products. */
export function visibleProducts<T extends { hidden?: boolean }>(products: T[]): T[] {
  return products.filter((product) => product.hidden !== true);
}
