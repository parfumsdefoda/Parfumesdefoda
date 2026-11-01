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
  HeroSection,
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
 * Homepage — hero, best sellers, categories and the advisor invitation.
 *
 * The trust facts and the questions used to live here too; the owner asked for
 * a shorter home, so they moved to their own pages (/shipping-returns, /faq)
 * and the button band now sits directly above the footer.
 *
 * Every section is a Server Component. The only client code on the page is the
 * advisor links and the quick-add islands on the eight cards — no marquee, no
 * framer-motion, no grid of forty hydrated cards.
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
      <HeroSection
        heading={t(locale, "home.heroHeading", "عطر يترك أثرًا قبل أن تتكلم")}
        lead={t(
          locale,
          "home.heroLead",
          "تشكيلة مختارة من العطور الشرقية والنيش، تُطلب في دقيقة واحدة والدفع عند الاستلام.",
        )}
        shopCta={t(locale, "home.shopNow", "تسوّق الآن")}
        advisorCta={t(locale, "home.chooseWithAdvisor", "اختر عطرك بالمساعد")}
      />

      <BestSellersSection
        products={bestSellers}
        labels={{
          title: t(locale, "home.bestSellers", "الأكثر مبيعًا"),
          viewAll: t(locale, "home.viewAll", "عرض الكل"),
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

      {/*
       * The advisor band and the footer are both --purple-950, and the band is
       * now the last section: without this seam the page ends in one tall dark
       * block. A narrow strip of the page background (plus the footer's gold
       * hairline) makes them read as two surfaces. Decoration only.
       */}
      <div aria-hidden="true" className="h-6 bg-[var(--color-bg)]" />
    </>
  );
}
