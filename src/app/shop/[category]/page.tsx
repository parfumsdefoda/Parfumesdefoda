import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";
import { formatNumber } from "@/lib/currency";
import { getSiteUrl } from "@/lib/seo";
import { parseCatalogState } from "@/lib/catalog-filters";
import { buildCatalogView } from "@/lib/catalog-query";
import {
  CATEGORY_ROUTES,
  categoryBySlug,
  categoryHref,
  genderPublicLabel,
} from "@/lib/site-nav";
import { CatalogSection } from "@/features/catalog";
import {
  buildCardLabels,
  buildControlsLabels,
  buildSectionLabels,
  columnsFor,
} from "@/features/catalog/catalog-props";
import { Breadcrumbs } from "@/features/layout";

/**
 * /shop/men · /shop/women · /shop/unisex — the catalogue with one gender pinned.
 *
 * The gender filter is applied on the server and removed from the filter bar,
 * so the page is the category rather than a catalogue the shopper can drift
 * out of; the URL never repeats `gender=` because the route already says it.
 */
interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return CATEGORY_ROUTES.map((route) => ({ category: route.slug }));
}


export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const route = categoryBySlug(category);
  if (!route) return { title: "الصفحة غير موجودة" };

  const [locale, products] = await Promise.all([loadLocale(), loadVisibleProducts()]);
  const label = genderPublicLabel(route.gender);
  const count = products.filter((product) => product.gender === route.gender).length;
  const description = t(
    locale,
    "shop.categoryDescription",
    "{count} عطر في قسم {label}.",
  )
    .replace("{count}", formatNumber(count))
    .replace("{label}", label);

  return {
    title: label,
    description,
    alternates: { canonical: categoryHref(route.slug) },
    openGraph: { title: label, description, url: categoryHref(route.slug) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  // Resolve the slug BEFORE touching searchParams: reading the query string
  // starts the dynamic render, and a notFound() after that point would be a
  // soft 404 (200 with the 404 page).
  const { category } = await params;
  const route = categoryBySlug(category);
  if (!route) notFound();
  const query = await searchParams;

  const [products, settings, locale] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
    loadLocale(),
  ]);

  // The route owns the gender: whatever the query string says is ignored.
  const state = { ...parseCatalogState(query), gender: [route.gender] };
  const view = buildCatalogView(products, state, ["gender"]);
  // The category's own size, not the current result set: the intro describes
  // the shelf, while the controls announce how many products are showing.
  const categorySize = products.filter(
    (product) => product.gender === route.gender,
  ).length;

  const label = genderPublicLabel(route.gender);
  const shopLabel = t(locale, "nav.shop", "المتجر");
  const homeLabel = t(locale, "nav.home", "الرئيسية");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-[var(--space-section)] pt-6">
      <Breadcrumbs
        className="mb-5"
        siteUrl={getSiteUrl()}
        items={[
          { label: homeLabel, href: "/" },
          { label: shopLabel, href: "/shop" },
          { label },
        ]}
      />

      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-title-3 font-bold text-[var(--color-text)]">{label}</h1>
        <p className="text-caption text-[var(--color-text-muted)]">
          {t(locale, "shop.categoryCount", "{count} عطر").replace(
            "{count}",
            formatNumber(categorySize),
          )}
        </p>
      </header>

      <CatalogSection
        view={view}
        columns={columnsFor(settings)}
        cardLabels={buildCardLabels(locale)}
        controlsLabels={buildControlsLabels(locale)}
        labels={buildSectionLabels(locale)}
        lockedKeys={["gender"]}
      />
    </div>
  );
}
