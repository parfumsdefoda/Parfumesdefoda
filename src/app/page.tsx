import type { Metadata } from "next";
import Link from "next/link";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";
import { selectBestSellers, BEST_SELLER_LIMIT, HOME_GRID_LIMIT } from "@/lib/best-sellers";
import { getSiteUrl } from "@/lib/seo";
import { buildCardLabels, columnsFor } from "@/features/catalog/catalog-props";
import { ProductGrid } from "@/features/products/components/product-grid";

/**
 * Homepage — header, the product grid directly, one full-width hairline row
 * into the catalogue, then the footer.
 *
 * The grid is the page: 12 products, in stock first, ordered by cached sales
 * counts when they exist and by the owner's master order otherwise. There is
 * no intro bar, no categories band and no advisor band — categories live only
 * in the header navigation. The page's single <h1> is visually hidden and
 * carries neutral text for accessibility and SEO.
 */
const description = "عطور شرقية وغربية وزيوت عطرية بأحجام متعددة";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await loadLocale();
  const title = t(locale, "home.pageTitle", "Parfums De Foda | العطور");
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: getSiteUrl(),
      type: "website",
      locale: "ar_AR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const [products, settings, locale] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
    loadLocale(),
  ]);

  const title = t(locale, "home.pageTitle", "Parfums De Foda | العطور");
  const viewAll = t(locale, "home.viewAllProducts", "عرض كل المنتجات");
  const visible = selectBestSellers(products, {}, HOME_GRID_LIMIT);

  return (
    <div className="overflow-x-clip bg-[var(--paper)]">
      <h1 className="sr-only">{title}</h1>

      <section aria-label={title}>
        <ProductGrid
          products={visible}
          columns={columnsFor(settings)}
          labels={buildCardLabels(locale)}
          features={settings.features}
          home
        />
      </section>

      <div className="border-t border-[var(--line)] bg-[var(--paper)]">
        <Link
          href="/shop"
          className="mx-auto flex min-h-[56px] w-full max-w-[1920px] items-center justify-center px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--gold-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
        >
          {viewAll}
        </Link>
      </div>
    </div>
  );
}
