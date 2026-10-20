import type { MetadataRoute } from "next";

/**
 * /robots.txt — generated so the sitemap URL always matches the deployment
 * (the static public/robots.txt always pointed at the production domain).
 */
export const dynamic = "force-static";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/checkout", "/checkout/success"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
