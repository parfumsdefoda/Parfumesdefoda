import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * Query keys that belong to the catalogue.
 *
 * The catalogue used to live at `/`, so shared and indexed links look like
 * `/?gender=رجالي`. They are 308-redirected to `/shop` with the query intact.
 * This lives in the config (not in page.tsx) because the root layout starts
 * streaming before the page body runs, and a redirect thrown at that point is
 * emitted inside the stream instead of as a real 308.
 */
const CATALOG_QUERY_KEYS = [
  "gender",
  "style",
  "tier",
  "season",
  "performance",
  "price",
  "available",
  "sort",
  "q",
];

const nextConfig: NextConfig = {
  async redirects() {
    return CATALOG_QUERY_KEYS.map((key) => ({
      source: "/",
      has: [{ type: "query" as const, key }],
      destination: "/shop",
      permanent: true,
    }));
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Only these two qualities may be requested — keeps the optimizer cache
    // small and prevents a component from quietly inventing a new value.
    qualities: [75, 85],
    // Remote patterns for future CMS integration
    remotePatterns: [],
  },

  // Runtime JSON files (data/, content/, locales/) are read via node:fs in
  // src/lib/json-loader.ts using process.cwd() + relativePath. Next.js's
  // automatic file tracing can't detect dynamic fs reads, so without this the
  // JSON files are excluded from the serverless bundle and every page request
  // fails at runtime with ENOENT (Vercel /var/task). Force-include them.
  outputFileTracingIncludes: {
    "/**": ["./locales/**/*", "./data/**/*", "./content/**/*"],
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Cache static assets aggressively
        source: "/logos/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // RTL is handled at the HTML level in layout.tsx
  // No i18n config needed for single-language Arabic site
};

export default nextConfig;
