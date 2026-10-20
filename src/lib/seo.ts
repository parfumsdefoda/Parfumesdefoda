/**
 * SEO helpers — pure, client-safe.
 */

const BRAND_NAME = "Parfums De Foda";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip a trailing brand suffix ("اسم العطر | Parfums De Foda") from a title.
 *
 * Product `seo.title` values in data/products.json already end with the brand,
 * and the root layout's metadata template appends it again — which is how the
 * site ended up with "أفريكان ليذر | Parfums De Foda | Parfums De Foda".
 */
export function stripBrandSuffix(title: string, brand: string = BRAND_NAME): string {
  const trimmed = title.trim();

  // A title that is nothing but the brand has no product part left to keep.
  if (trimmed.toLowerCase() === brand.toLowerCase()) return "";

  const pattern = new RegExp(
    `\\s*[|—–-]\\s*${escapeRegExp(brand)}\\s*$`,
    "i",
  );
  return trimmed.replace(pattern, "").trim();
}

/**
 * Resolve the page title for a product.
 *
 * The root metadata template appends "| Parfums De Foda" once, so the title
 * returned here must NOT contain the brand: prefer the product's own
 * `seo.title` (brand suffix stripped), otherwise the product name.
 */
export function buildProductTitle(product: {
  name: string;
  seo?: { title?: string };
}): string {
  const raw = product.seo?.title?.trim();
  const stripped = raw ? stripBrandSuffix(raw) : "";
  return stripped || product.name;
}

/** Absolute product URL path (canonical). */
export function productPath(slug: string): string {
  return `/product/${slug}`;
}
