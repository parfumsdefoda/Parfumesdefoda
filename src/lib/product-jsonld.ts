/**
 * Product structured data.
 *
 * Only facts the catalogue owns: the name, its own description, the image
 * files it actually has, the URL, and one AggregateOffer whose range comes from
 * the sizes a shopper can buy. There is no rating, no review count and no brand
 * claim here — the store has none of those, and inventing them is both a lie
 * and a rich-result violation.
 *
 * Pure and client-safe.
 */

import type { Product } from "@/types";
import { buildProductImageSources, imageSlug } from "./product-image";
import { productPath } from "./seo";

export const EGP = "EGP";

export interface ProductOffer {
  priceCurrency: typeof EGP;
  lowPrice: number;
  highPrice: number;
  offerCount: number;
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
}

export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description?: string;
  image: string[];
  url: string;
  sku: string;
  offers?: ProductOffer;
}

/** Every derived image the product can show, as absolute URLs. */
function productImages(product: Product, siteUrl: string): string[] {
  const sources = [product.image, ...(product.gallery ?? [])];
  const slugs = [
    ...new Set(
      sources
        .map((source) => imageSlug(source))
        .filter((slug): slug is string => slug !== null),
    ),
  ];

  const derived = slugs
    .map((slug) => buildProductImageSources(slug, "pdp")?.src ?? null)
    .filter((src): src is string => src !== null)
    .map((src) => `${siteUrl}${src}`);

  if (derived.length > 0) return [...new Set(derived)];
  return product.image.startsWith("http")
    ? [product.image]
    : [`${siteUrl}${product.image}`];
}

/**
 * The offer block, or nothing.
 *
 * RUN 1.6: a fully out-of-stock product still carries an offer, marked
 * OutOfStock, with its range taken from the listed sizes — the structured
 * data states the truth (it is unavailable) instead of omitting the offer.
 */
export function buildProductOffer(product: Product): ProductOffer | undefined {
  const buyable = product.sizes.filter((size) => size.inStock);
  if (buyable.length === 0) {
    if (product.sizes.length === 0) return undefined;
    const listed = product.sizes.map((size) => size.price);
    return {
      priceCurrency: EGP,
      lowPrice: Math.min(...listed),
      highPrice: Math.max(...listed),
      offerCount: listed.length,
      availability: "https://schema.org/OutOfStock",
    };
  }

  const prices = buyable.map((size) => size.price);
  return {
    priceCurrency: EGP,
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: buyable.length,
    availability: "https://schema.org/InStock",
  };
}

export function buildProductJsonLd(
  product: Product,
  siteUrl: string,
): ProductJsonLd {
  const description = product.description?.trim();
  const offers = buildProductOffer(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(description ? { description } : {}),
    image: productImages(product, siteUrl),
    url: `${siteUrl}${productPath(product.slug)}`,
    sku: product.sku,
    ...(offers ? { offers } : {}),
  };
}
