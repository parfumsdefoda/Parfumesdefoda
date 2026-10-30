import { t } from "@/lib/locale";
import { toGridColumns } from "@/lib/grid-columns";
import type { CatalogControlsLabels } from "./components/catalog-controls";
import type { CatalogSectionLabels } from "./components/catalog-section";
import type { ProductCardLabels } from "@/features/products";
import type { FullSettings, LocaleMessages } from "@/types/services";

/**
 * The catalogue's text, resolved once per request.
 *
 * `/shop` and the three category routes render the same section, so the labels
 * are built in one place; a missing key falls back to the Arabic default that
 * lives next to the component.
 *
 * Server-side module (it reads nothing more than a locale object), but it must
 * not be imported by a client component — it is only used by Server Components.
 */

export function buildCardLabels(locale: LocaleMessages): ProductCardLabels {
  return {
    comingSoon: t(locale, "product.comingSoon", "قريبًا"),
    outOfStock: t(locale, "home.outOfStock", "غير متوفر"),
    from: t(locale, "home.from", "من"),
    add: t(locale, "home.addToCart", "أضف إلى السلة"),
    addToCart: t(locale, "home.addToCart", "أضف إلى السلة"),
    chooseSize: t(locale, "product.selectSize", "اختر الحجم"),
    addedToast: t(locale, "home.addedToast", "تمت إضافة {name} إلى السلة"),
  };
}

export function buildControlsLabels(locale: LocaleMessages): CatalogControlsLabels {
  return {
    searchPlaceholder: t(locale, "home.searchPlaceholder", "ابحث عن عطرك..."),
    search: t(locale, "catalog.search", "بحث"),
    clearSearch: t(locale, "catalog.clearSearch", "مسح البحث"),
    filters: t(locale, "catalog.filters", "الفلاتر"),
    clearAll: t(locale, "catalog.clearAll", "مسح الكل"),
    availableOnly: t(locale, "catalog.availableOnly", "المتوفر فقط"),
    resultUnit: t(locale, "catalog.resultUnit", "منتج"),
    sort: t(locale, "catalog.sort", "الترتيب"),
    sortFeatured: t(locale, "catalog.sortFeatured", "الافتراضي"),
    sortPriceAsc: t(locale, "catalog.sortPriceAsc", "الأقل سعرًا"),
    sortPriceDesc: t(locale, "catalog.sortPriceDesc", "الأعلى سعرًا"),
    sortName: t(locale, "catalog.sortName", "الاسم (أ-ي)"),
    showResults: t(locale, "catalog.showResults", "عرض {count} منتج"),
    remove: t(locale, "catalog.remove", "إزالة"),
    groups: {
      gender: t(locale, "catalog.groupGender", "الجنس"),
      style: t(locale, "catalog.groupStyle", "النوع"),
      form: t(locale, "catalog.groupForm", "الصيغة"),
      tier: t(locale, "catalog.groupTier", "الدار"),
      performance: t(locale, "catalog.groupPerformance", "الأداء"),
      size: t(locale, "catalog.groupSize", "المقاس"),
    },
  };
}

export function buildSectionLabels(locale: LocaleMessages): CatalogSectionLabels {
  return {
    title: t(locale, "nav.products", "منتجاتنا"),
    emptyTitle: t(locale, "catalog.emptyTitle", "لا توجد منتجات مطابقة"),
    emptyHint: t(locale, "catalog.emptyHint", "جرّب إزالة بعض الفلاتر أو البحث باسم آخر"),
    clearFilters: t(locale, "catalog.clearFilters", "مسح الفلاتر"),
  };
}

/** The grid columns the store's settings define (clamped 2–4). */
export function columnsFor(settings: FullSettings) {
  return toGridColumns(settings.grid);
}
