"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { PageLayout } from "@/features/layout";
import { SearchBar } from "@/features/search";
import { FilterSidebar } from "@/features/filters";
import { ProductGrid } from "@/features/products";
import { HeroShowcase, type HeroShowcaseItem } from "./hero-showcase";
import { CartDrawer } from "@/features/cart";
import { FaqAccordion } from "@/features/faq";
import { PoliciesAccordion } from "@/features/policies";
import { NoResults } from "@/features/empty-states";

import { useProducts } from "@/hooks/use-products";
import { useFilters } from "@/hooks/use-filters";
import { useSettings } from "@/hooks/use-settings";
import { useLocalization } from "@/hooks/use-localization";
import { useContent } from "@/hooks/use-content";
import { useCart } from "@/providers/CartProvider";

import type { Product } from "@/types";
import type { FullSettings, FilterData, SiteContent, LocaleMessages } from "@/types/services";
import type { SortOption } from "@/lib/sort-helpers";
import { getShippingFee } from "@/lib/shipping";

/**
 * Props for the client-side HomePage component.
 * All data is pre-loaded by the Server Component (page.tsx).
 */
export interface HomePageClientProps {
  products: Product[];
  settings: FullSettings;
  filterData: FilterData;
  content: SiteContent;
  localeMessages: LocaleMessages;
  /** Product sales counts (productId -> total quantity sold), loaded server-side from Redis. */
  salesCounts?: Record<string, number>;
  /** Randomized product set for the animated hero marquee (computed server-side). */
  heroProducts?: HeroShowcaseItem[];
}

/**
 * Client-side homepage component.
 *
 * Receives pre-loaded data from the Server Component and manages
 * all interactive state: filtering, searching, sorting, cart.
 * Checkout is handled via /checkout route.
 *
 * No client-side data fetching — all file I/O happens server-side.
 */
export function HomePageClient({
  products: initialProducts,
  settings: initialSettings,
  filterData: initialFilterData,
  content: initialContent,
  localeMessages: initialMessages,
  salesCounts = {},
  heroProducts = [],
}: HomePageClientProps) {
  const router = useRouter();

  // ─── Hooks (receive pre-loaded data) ───
  const products = useProducts(initialProducts, salesCounts);
  const filters = useFilters(initialFilterData);
  const settings = useSettings(initialSettings);
  const locale = useLocalization(initialMessages);
  const content = useContent(initialContent);
  const cart = useCart();

  // ─── UI State ───
  // Drawer open/close lives in CartProvider (shared with the chat widget so it
  // can unmount while the drawer is open) — no local state here.
  const [filterOpen, setFilterOpen] = useState(false);

  // ─── Derived ───
  const t = locale.t;

  // Flat shipping fee from data/settings.json — single source of truth.
  const shippingFee = getShippingFee(settings);

  // Destructure frequently used values to avoid useMemo dependency issues
  const { activeFilters, toggleFilter, sortBy, setSortBy, clearFilters } = products;

  // Map filter groups to sidebar format.
  // The "الترتيب" (sort) group is treated specially: instead of toggling
  // filter checkboxes, it calls products.setSortBy() to reorder the list.
  const isSortGroup = (group: { name: string }) => group.name === "الترتيب";

  const filterSidebarGroups = useMemo(
    () =>
      filters.filterGroups.map((group) => {
        const sortGroup = isSortGroup(group);
        return {
          name: group.name,
          options: group.options.map((opt) => ({
            slug: opt.slug,
            label: opt.label,
          })),
          activeSlugs: sortGroup
            ? [sortBy]
            : (activeFilters[group.name] ?? []),
          onToggle: (slug: string) => {
            if (sortGroup) {
              setSortBy(slug as SortOption);
            } else {
              toggleFilter(group.name, slug);
            }
          },
        };
      }),
    [filters.filterGroups, activeFilters, toggleFilter, sortBy, setSortBy],
  );

  // Cart items mapped to CartDrawer format
  const cartDrawerItems = useMemo(
    () =>
      cart.items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        sizeLabel: item.sizeLabel,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
        image: item.image,
      })),
    [cart.items],
  );

  // ─── Handlers ───
  const handleCartCheckout = () => {
    cart.closeDrawer();
    router.push("/checkout");
  };

  // Clear all filters AND reset sort to default
  const handleClearAll = () => {
    clearFilters();
    setSortBy("best-selling");
  };

  return (
    <PageLayout
      headerProps={{
        navItems: settings.navigation,
        cartCount: cart.totalItems,
        onCartClick: () => cart.openDrawer(),
        menuLabel: t("home.filters", "تصفية"),
        filterOpen,
        onFilterClick: () => setFilterOpen(true),
      }}
      footerProps={{
        description: settings.footerDescription,
        columns: settings.footerColumns,
      }}
    >
      {/* ─── Animated Hero Showcase (living catalog marquee) ─── */}
      {heroProducts.length > 0 && (
        <HeroShowcase
          items={heroProducts}
          title={t("home.heroTitle", "اكتشف تشكيلتنا الفاخرة")}
          ariaLabel={t("home.heroAria", "تشكيلة العطور الفاخرة")}
        />
      )}

      {/* ─── Main Content ─── */}
      <section id="main-content" className="container mx-auto px-4 py-[var(--space-section)]">
        {/* Section heading for the product catalogue: visually hidden, but it
            keeps the outline sane (h1 hero -> h2 catalogue -> h3 filter
            groups -> h2 FAQ/policies/contact). */}
        <h2 className="sr-only">{t("nav.products", "منتجاتنا")}</h2>

        {/* Search */}
        <div className="mb-8">
          <SearchBar
            value={products.searchQuery}
            onChange={products.setSearchQuery}
            placeholder={t("home.searchPlaceholder", "ابحث عن عطرك...")}
            className="w-full max-w-md"
          />
        </div>

        {/* Active filters bar */}
        {products.hasActiveFilters && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-caption text-[var(--neutral-500)]">
              {t("home.filters", "تصفية")} ({products.activeFilterCount})
            </span>
            <button
              onClick={products.clearFilters}
              className="text-caption text-[var(--color-accent)] hover:underline"
            >
              {t("home.clearFilters", "إزالة التصفية")}
            </button>
          </div>
        )}

        {/* Sidebar + Grid */}
        <div className="flex gap-8">
          <FilterSidebar
            groups={filterSidebarGroups}
            heading={t("home.filters", "تصفية")}
            clearLabel={t("home.clearFilters", "إزالة التصفية")}
            activeCount={products.activeFilterCount}
            onClearAll={handleClearAll}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          <div className="flex-1">
            {products.products.length === 0 ? (
              <NoResults
                title={t("home.noProducts", "لا توجد منتجات تطابق اختيارك")}
                description={t("home.noProductsHint", "جرب تغيير معايير البحث أو التصفية")}
                actionLabel={
                  products.hasActiveFilters
                    ? t("home.clearFilters", "إزالة التصفية")
                    : undefined
                }
                onAction={
                  products.hasActiveFilters ? products.clearFilters : undefined
                }
              />
            ) : (
              <ProductGrid
                products={products.products}
                labels={{
                  comingSoon: t("product.comingSoon", "قريبًا"),
                  outOfStock: t("home.outOfStock", "غير متوفر"),
                  from: t("catalog.from", "من"),
                  add: t("home.addToCart", "أضف إلى السلة"),
                  addToCart: t("home.addToCart", "أضف إلى السلة"),
                  chooseSize: t("product.selectSize", "اختر الحجم"),
                  addedToast: t(
                    "home.addedToast",
                    "تمت إضافة {name} إلى السلة",
                  ),
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      {content.faq.length > 0 && (
        <section className="container mx-auto px-4 py-[var(--space-section)]">
          <FaqAccordion
            items={content.faq}
            title={t("faq.title", "الأسئلة الشائعة")}
          />
        </section>
      )}

      {/* ─── Policies ─── */}
      {content.policies.length > 0 && (
        <section className="container mx-auto px-4 py-[var(--space-section)] border-t border-[var(--border-default)]">
          <PoliciesAccordion
            sections={content.policies}
            title={t("policies.title", "السياسات")}
          />
        </section>
      )}

      {/* ─── Contact ─── */}
      <section id="contact" className="container mx-auto px-4 py-[var(--space-section)] border-t border-[var(--border-default)]">
        <h2 className="text-title-3 font-bold text-[var(--neutral-800)] mb-2 text-center">
          {t("contact.title", "اتصل بنا")}
        </h2>
        <p className="text-[var(--neutral-500)] text-center mb-8">
          {t("contact.description", "تواصل معنا لأي استفسار أو طلب")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {settings.contact.whatsapp && (
            <a
              href={`https://wa.me/${settings.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-6 py-3 text-caption font-medium text-[var(--neutral-700)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-5 w-5" />
              {t("contact.whatsapp", "راسلنا عبر واتساب")}
            </a>
          )}
          {settings.contact.email && (
            <a
              href={`mailto:${settings.contact.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-6 py-3 text-caption font-medium text-[var(--neutral-700)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              <Mail className="h-5 w-5" />
              {t("contact.email", "أرسل لنا بريداً إلكترونياً")}
            </a>
          )}
        </div>
      </section>

      {/* ─── Cart Drawer ─── */}
      <CartDrawer
        open={cart.isDrawerOpen}
        onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}
        items={cartDrawerItems}
        title={t("cart.title", "سلة التسوق")}
        emptyTitle={t("cart.empty", "سلة التسوق فارغة")}
        emptyDescription={t(
          "cart.emptyDescription",
          "أضف منتجات إلى السلة للمتابعة",
        )}
        totalLabel={t("cart.total", "المجموع")}
        checkoutLabel={t("cart.checkout", "إتمام الطلب")}
        removeLabel={t("cart.remove", "إزالة")}
        quantityLabel={t("cart.quantity", "الكمية")}
        itemsCountLabel={t("cart.itemsCount", "عدد القطع")}
        continueShoppingLabel={t("cart.continueShopping", "متابعة التسوق")}
        shippingFee={shippingFee}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={handleCartCheckout}
      />
    </PageLayout>
  );
}
