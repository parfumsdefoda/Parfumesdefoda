/**
 * SEO types — matches the schema in data/seo.json.
 */
export interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  openGraph: {
    title: string;
    description: string;
    image: string;
    type: string;
    locale: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
  };
  canonical: string;
  robots: string;
  sitemap: string;
}
