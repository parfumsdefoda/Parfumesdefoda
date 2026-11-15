import type { Metadata } from "next";
import { loadVisibleProducts } from "@/services/products";
import { loadLocale } from "@/services/localization";
import { readProductSalesCounts } from "@/lib/sales-tracking";
import { selectBestSellers } from "@/lib/best-sellers";
import { genderCounts, CATEGORY_ROUTES, categoryHref, genderPublicLabel } from "@/lib/site-nav";
import { t } from "@/lib/locale";
import { buildCardLabels } from "@/features/catalog/catalog-props";
import {
  AdvisorBand,
  BestSellersSection,
  CategoryTiles,
  IntroBar,
} from "@/features/home";

/**
 * The homepage is a marketing page, regenerated every five minutes.
 *
 * It is deliberately static-ish: no search params, no per-request catalogue.
 * Filtering, sorting and search moved to `/shop`, so this route can be cached
 * and served from the CDN, which is where the mobile LCP win comes from.
 * Best-seller ordering reads the Redis sales counts behind a short timeout, so
 * a slow or unconfigured Redis only changes the order — never the response.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await loadLocale();
  const title = t(locale, "home.pageTitle", "Parfums De Foda — عطور فاخرة");
  const description = t(
    locale,
    "home.pageDescription",
    "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة",
  );
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/" },
  };
}

/**
 * Homepage — intro bar, best sellers, categories and the advisor invitation.
 *
 * The hero was removed in the gallery redesign: the page opens on an h1 and the
 * "عرض الكل" link, and the eight best sellers sit directly under it in the same
 * hairline grid the catalogue uses. Every section is a Server Component; the
 * only client code is the advisor button and the quick-add islands on the cards.
 */
export default async function HomePage() {
  const [products, locale, salesCounts] = await Promise.all([
    loadVisibleProducts(),
    loadLocale(),
    readProductSalesCounts(),
  ]);

  const bestSellers = selectBestSellers(products, salesCounts);
  const counts = genderCounts(products);

  const categoryLabels: Record<(typeof CATEGORY_ROUTES)[number]["slug"], string> = {
    men: t(locale, "nav.men", "رجالي"),
    women: genderPublicLabel("نسائي"),
    unisex: t(locale, "nav.unisex", "للجنسين"),
  };

  return (
    <>
      <IntroBar
        heading={t(locale, "home.introHeading", "عطور تبقى في الذاكرة")}
        viewAll={t(locale, "home.viewAll", "عرض الكل")}
      />

      <BestSellersSection
        products={bestSellers}
        labels={{
          title: t(locale, "home.bestSellers", "الأكثر مبيعًا"),
          card: buildCardLabels(locale),
        }}
      />

      <CategoryTiles
        title={t(locale, "home.shopByCategory", "تسوّق حسب القسم")}
        countLabel={t(locale, "shop.categoryCount", "{count} عطر")}
        tiles={CATEGORY_ROUTES.map((route) => ({
          label: categoryLabels[route.slug],
          href: categoryHref(route.slug),
          count: counts[route.gender] ?? 0,
        }))}
      />

      <AdvisorBand
        title={t(locale, "home.advisorTitle", "محتار في الاختيار؟")}
        body={t(
          locale,
          "home.advisorBody",
          "جاوب على سؤالين والمساعد يرشّح لك عطورًا من التشكيلة نفسها.",
        )}
        cta={t(locale, "home.advisorCta", "اختر عطرك")}
      />
    </>
  );
}
