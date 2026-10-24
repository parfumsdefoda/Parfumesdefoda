import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadContent } from "@/services/content";
import { loadLocale } from "@/services/localization";
import { selectHeroShowcase } from "@/lib/hero-selection";
import { t } from "@/lib/locale";
import { parseCatalogState } from "@/lib/catalog-filters";
import { buildCatalogView } from "@/lib/catalog-query";
import { toGridColumns } from "@/lib/grid-columns";
import { HomePageClient } from "@/features/home";
import { CatalogSection } from "@/features/catalog";

/**
 * The storefront renders per request: the hero marquee is re-randomised on
 * every visit and the catalogue is filtered from the query string.
 */
export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Homepage — Parfums De Foda.
 *
 * Server Component that loads ALL data from JSON files using node:fs/promises.
 *
 * The catalogue is filtered, sorted and counted HERE, from the URL, and handed
 * to `CatalogSection` as server-rendered children of the client chrome. That
 * is what lets the product cards stay Server Components while the filter bar
 * still feels instant: a filter change is a navigation, not a re-render of the
 * whole grid in the browser.
 *
 * No client-side data fetching. No fetch() calls for local files.
 * Data flow: JSON files → Services → Server Component → Client chrome → HTML
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  // ─── Load all data server-side ───
  const [products, settings, content, localeMessages] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
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

  // ─── Catalogue view from the URL ───
  const state = parseCatalogState(params);
  const view = buildCatalogView(products, state);

  const cardLabels = {
    comingSoon: t(localeMessages, "product.comingSoon", "قريبًا"),
    outOfStock: t(localeMessages, "home.outOfStock", "غير متوفر"),
    from: t(localeMessages, "home.from", "من"),
    add: t(localeMessages, "home.addToCart", "أضف إلى السلة"),
    addToCart: t(localeMessages, "home.addToCart", "أضف إلى السلة"),
    chooseSize: t(localeMessages, "product.selectSize", "اختر الحجم"),
    addedToast: t(
      localeMessages,
      "home.addedToast",
      "تمت إضافة {name} إلى السلة",
    ),
  };

  const controlsLabels = {
    searchPlaceholder: t(
      localeMessages,
      "home.searchPlaceholder",
      "ابحث عن عطرك...",
    ),
    search: t(localeMessages, "catalog.search", "بحث"),
    clearSearch: t(localeMessages, "catalog.clearSearch", "مسح البحث"),
    filters: t(localeMessages, "catalog.filters", "الفلاتر"),
    clearAll: t(localeMessages, "catalog.clearAll", "مسح الكل"),
    availableOnly: t(localeMessages, "catalog.availableOnly", "المتوفر فقط"),
    resultUnit: t(localeMessages, "catalog.resultUnit", "منتج"),
    sort: t(localeMessages, "catalog.sort", "الترتيب"),
    sortFeatured: t(localeMessages, "catalog.sortFeatured", "الافتراضي"),
    sortPriceAsc: t(localeMessages, "catalog.sortPriceAsc", "الأقل سعرًا"),
    sortPriceDesc: t(localeMessages, "catalog.sortPriceDesc", "الأعلى سعرًا"),
    sortName: t(localeMessages, "catalog.sortName", "الاسم (أ-ي)"),
    showResults: t(localeMessages, "catalog.showResults", "عرض {count} منتج"),
    remove: t(localeMessages, "catalog.remove", "إزالة"),
    groups: {
      gender: t(localeMessages, "catalog.groupGender", "الجنس"),
      style: t(localeMessages, "catalog.groupStyle", "النوع"),
      tier: t(localeMessages, "catalog.groupTier", "الدار"),
      season: t(localeMessages, "catalog.groupSeason", "الفصل"),
      performance: t(
        localeMessages,
        "catalog.groupPerformance",
        "الأداء",
      ),
      price: t(localeMessages, "catalog.groupPrice", "السعر"),
    },
  };

  return (
    <HomePageClient
      settings={settings}
      content={content}
      localeMessages={localeMessages}
      heroProducts={heroProducts}
    >
      <CatalogSection
        view={view}
        columns={toGridColumns(settings.grid)}
        cardLabels={cardLabels}
        controlsLabels={controlsLabels}
        labels={{
          title: t(localeMessages, "nav.products", "منتجاتنا"),
          emptyTitle: t(
            localeMessages,
            "catalog.emptyTitle",
            "لا توجد منتجات مطابقة",
          ),
          emptyHint: t(
            localeMessages,
            "catalog.emptyHint",
            "جرّب إزالة بعض الفلاتر أو البحث باسم آخر",
          ),
          clearFilters: t(localeMessages, "catalog.clearFilters", "مسح الفلاتر"),
        }}
      />
    </HomePageClient>
  );
}
