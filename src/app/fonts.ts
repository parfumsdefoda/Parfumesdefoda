/**
 * Cairo is self-hosted at public/fonts/cairo and declared with @font-face in
 * src/app/globals.css; the body rule reads --font-cairo.
 *
 * It used to come from next/font/google, which fetches the family during
 * `next build`. That made the build depend on the network, and a CI run failed
 * with "Failed to fetch Cairo from Google Fonts". Self-hosting the same woff2
 * subsets renders identically and lets the build run offline.
 */
export const cairo = { variable: "font-cairo" } as const;
