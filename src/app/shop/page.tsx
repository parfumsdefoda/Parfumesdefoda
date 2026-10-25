import type { Metadata } from "next";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";
import { formatNumber } from "@/lib/currency";
import { parseCatalogState } from "@/lib/catalog-filters";
import { buildCatalogView } from "@/lib/catalog-query";
import { CatalogSection } from "@/features/catalog";
import {
  buildCardLabels,
  buildControlsLabels,
  buildSectionLabels,
  columnsFor,
} from "@/features/catalog/catalog-props";

/**
 * /shop — the whole catalogue.
 *
 * The Phase 3 catalogue moved here unchanged when `/` became the marketing
 * homepage. Filters, sorting and search still live in the URL and are still
 * resolved on the server, so every view stays shareable and indexable.
 */
interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, products] = await Promise.all([loadLocale(), loadVisibleProducts()]);
  const title = t(locale, "nav.shop", "المتجر");
  const description = t(
    locale,
    "shop.description",
    "كل العطور في مكان واحد — تصفّح حسب الجنس، النوع، الدار والمقاس.",
  );
  return {
    title,
    description: description.replace("{count}", formatNumber(products.length)),
    alternates: { canonical: "/shop" },
    openGraph: { title, description, url: "/shop" },
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  const [products, settings, locale] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
    loadLocale(),
  ]);

  const state = parseCatalogState(params);
  const view = buildCatalogView(products, state);

  const heading = t(locale, "nav.shop", "المتجر");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-[var(--space-section)] pt-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-title-3 font-bold text-[var(--color-text)]">
          {heading}
        </h1>
        <p className="text-caption text-[var(--color-text-muted)]">
          {t(locale, "shop.lead", "تصفّح التشكيلة كاملة.")}
        </p>
      </header>

      <CatalogSection
        view={view}
        columns={columnsFor(settings)}
        cardLabels={buildCardLabels(locale)}
        controlsLabels={buildControlsLabels(locale)}
        labels={buildSectionLabels(locale)}
      />
    </div>
  );
}
