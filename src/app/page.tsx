import type { Metadata } from "next";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadContent } from "@/services/content";
import { loadLocale } from "@/services/localization";
import { readProductSalesCounts } from "@/lib/sales-tracking";
import { selectBestSellers } from "@/lib/best-sellers";
import { selectHeroProducts } from "@/lib/hero-products";
import { genderCounts, CATEGORY_ROUTES, categoryHref, genderPublicLabel } from "@/lib/site-nav";
import { getShippingFee } from "@/lib/shipping";
import { formatPrice } from "@/lib/currency";
import { t } from "@/lib/locale";
import { buildCardLabels } from "@/features/catalog/catalog-props";
import {
  AdvisorBand,
  BestSellersSection,
  CategoryTiles,
  HeroSection,
  HomeFaq,
  TrustBand,
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
 * Homepage — hero, best sellers, categories, the advisor invitation, the three
 * facts the store can stand behind, and five questions.
 *
 * Every section is a Server Component. The only client code on the page is the
 * advisor links, the FAQ accordion and the quick-add islands on the eight
 * cards — no marquee, no framer-motion, no grid of forty hydrated cards.
 */
export default async function HomePage() {
  const [products, settings, content, locale, salesCounts] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
    loadContent(),
    loadLocale(),
    readProductSalesCounts(),
  ]);

  const bestSellers = selectBestSellers(products, salesCounts);
  const heroBottles = selectHeroProducts(
    products,
    salesCounts,
    settings.heroProducts ?? [],
  );
  const counts = genderCounts(products);
  const shippingFee = formatPrice(getShippingFee(settings));

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
        bottles={heroBottles}
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

      <TrustBand
        title={t(locale, "home.trustTitle", "كيف يصل طلبك")}
        items={[
          {
            icon: "payment",
            title: t(locale, "home.trustCod", "الدفع عند الاستلام"),
            detail: t(
              locale,
              "home.trustCodDetail",
              "تدفع لشركة الشحن عند وصول الطلب.",
            ),
          },
          {
            icon: "shipping",
            title: t(locale, "home.trustShipping", "شحن ثابت"),
            detail: t(
              locale,
              "home.trustShippingDetail",
              "{fee} لكل الطلبات.",
            ).replace("{fee}", shippingFee),
          },
          {
            icon: "confirmation",
            title: t(locale, "home.trustConfirm", "تأكيد عبر واتساب"),
            detail: t(
              locale,
              "home.trustConfirmDetail",
              "نتواصل معك على واتساب لتأكيد الطلب.",
            ),
          },
        ]}
      />

      <HomeFaq
        title={t(locale, "faq.title", "الأسئلة الشائعة")}
        items={content.faq}
        allLabel={t(locale, "home.faqAll", "كل الأسئلة")}
      />
    </>
  );
}
