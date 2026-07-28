import type { SeoConfig } from "@/types";
import { readJsonFile } from "@/lib/json-loader";

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
 * Load SEO configuration from data/seo.json using server-side file reading.
 */
export async function loadSeoConfig(): Promise<SeoConfig> {
  return readJsonFile<SeoConfig>("data/seo.json", defaultSeo);
}
