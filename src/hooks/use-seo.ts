"use client";

import type { SeoConfig } from "@/types";

export interface UseSeoReturn {
  /** SEO configuration */
  seo: SeoConfig;
  /** Whether SEO config is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

const defaultSeo: SeoConfig = {
  title: "Parfums De Foda",
  description: "",
  keywords: "",
  openGraph: {
    title: "",
    description: "",
    image: "",
    type: "website",
    locale: "ar_AR",
  },
  twitter: { card: "summary_large_image", title: "", description: "" },
  canonical: "",
  robots: "index, follow",
  sitemap: "/sitemap.xml",
};

/**
 * Hook for consuming SEO metadata.
 *
 * Data is pre-loaded by the Server Component and passed as initialSeo.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useSeo(initialSeo: SeoConfig = defaultSeo): UseSeoReturn {
  return {
    seo: initialSeo,
    isLoading: false,
    error: null,
  };
}
