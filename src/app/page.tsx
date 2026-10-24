import { Suspense } from "react";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadFilterData } from "@/services/filters";
import { loadContent } from "@/services/content";
import { loadLocale } from "@/services/localization";
import { getProductSalesCounts } from "@/services/sales";
import { selectHeroShowcase } from "@/lib/hero-selection";
import { t } from "@/lib/locale";
import { HomePageClient, type HomePageClientProps } from "@/features/home";
import { StorefrontSkeleton } from "@/features/home/components/storefront-skeleton";

/**
 * The storefront renders per request: the hero marquee is re-randomised on
 * every visit and the catalogue is read fresh. The expensive part (Redis) is
 * cached separately in src/services/sales.ts, so "dynamic" no longer means
 * "slow".
 */
export const dynamic = "force-dynamic";

/**
 * Homepage — Parfums De Foda.
 *
 * Server Component that loads ALL data from JSON files using node:fs/promises.
 * Data is passed as props to the client-side HomePageClient component,
 * which handles interactivity (filters, search, sorting, cart, checkout).
 *
 * Two awaits, two priorities:
 *
 * 1. The catalogue itself (products, settings, filters, content, locale) is
 *    required before anything can render.
 * 2. Product sales counts come from Redis and only influence the best-selling
 *    order and badges. They are fetched inside a Suspense boundary, so the
 *    shell streams immediately and a slow Redis cannot hold the page hostage.
 *    `getProductSalesCounts()` is cached for 5 minutes and the read itself is
 *    skipped when unconfigured and capped by a 300 ms timeout.
 *
 * No client-side data fetching. No fetch() calls for local files. All file I/O
 * and Redis access is server-side.
 * Data flow: JSON files → Services → Server Component → Client Component → Hooks → UI
 */
export default async function HomePage() {
  // ─── Load all data server-side ───
  const [products, settings, filterData, content, localeMessages] =
    await Promise.all([
      loadVisibleProducts(),
      loadFullSettings(),
      loadFilterData(),
      loadContent(),
      loadLocale(),
    ]);

  // ─── Server-side error handling ───
  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-title-3 font-bold text-[var(--neutral-700)] mb-2">
            عذراً، لا توجد منتجات حالياً
          </h2>
          <p className="text-[var(--neutral-500)]">
            يرجى المحاولة مرة أخرى لاحقاً
          </p>
        </div>
      </div>
    );
  }

  // Randomize the hero marquee set per page load (featured first, then random)
  const heroProducts = selectHeroShowcase(products);

  return (
    <Suspense
      fallback={
        <StorefrontSkeleton label={t(localeMessages, "home.loading", "جاري التحميل...")} />
      }
    >
      <Storefront
        products={products}
        settings={settings}
        filterData={filterData}
        content={content}
        localeMessages={localeMessages}
        heroProducts={heroProducts}
      />
    </Suspense>
  );
}

/**
 * The part that waits for Redis. Kept as its own Server Component so the
 * Suspense boundary above has an async child to stream.
 */
async function Storefront(
  props: Omit<HomePageClientProps, "salesCounts">,
) {
  const salesCounts = await getProductSalesCounts();
  return <HomePageClient {...props} salesCounts={salesCounts} />;
}
