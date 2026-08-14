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

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
