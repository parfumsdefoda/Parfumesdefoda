import type { MetadataRoute } from "next";
import { loadVisibleProducts } from "@/services/products";
import { CATEGORY_ROUTES, categoryHref } from "@/lib/site-nav";

/**
 * /sitemap.xml — every public route, generated from the same data the pages use.
 *
 * The catalogue, the three category routes, the help pages and the 40 product
 * pages. Hidden products (on_site=لا) answer 404, so they are not listed.
 */
export const dynamic = "force-static";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await loadVisibleProducts();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/shop`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...CATEGORY_ROUTES.map((route) => ({
      url: `${siteUrl}${categoryHref(route.slug)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${siteUrl}/faq`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${siteUrl}/shipping-returns`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${siteUrl}/product/${product.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
