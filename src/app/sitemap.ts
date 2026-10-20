import type { MetadataRoute } from "next";
import { loadProducts } from "@/services/products";

/**
 * /sitemap.xml — generated from data/products.json.
 *
 * Adding a product to the catalog is enough for it to appear here; the old
 * hand-written public/sitemap.xml only ever listed the homepage.
 */
export const dynamic = "force-static";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await loadProducts();
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...products.map((product) => ({
      url: `${siteUrl}/product/${product.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
