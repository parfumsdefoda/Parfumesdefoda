"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { PageLayout } from "@/features/layout";
import { SearchBar } from "@/features/search";
import { FilterSidebar } from "@/features/filters";
import { ProductGrid, type ProductCardProduct } from "@/features/products";
import { CartDrawer } from "@/features/cart";
import { FaqAccordion } from "@/features/faq";
import { PoliciesAccordion } from "@/features/policies";
import { NoResults } from "@/features/empty-states";
import { useToast } from "@/features/toast";

import { useProducts } from "@/hooks/use-products";
import { useFilters } from "@/hooks/use-filters";
import { useSettings } from "@/hooks/use-settings";
import { useLocalization } from "@/hooks/use-localization";
import { useContent } from "@/hooks/use-content";
import { useCart } from "@/providers/CartProvider";

import type { Product } from "@/types";
import type { FullSettings, FilterData, SiteContent, LocaleMessages } from "@/types/services";

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
}: HomePageClientProps) {
  const router = useRouter();

  // ─── Hooks (receive pre-loaded data) ───
  const products = useProducts(initialProducts);
  const filters = useFilters(initialFilterData);
  const settings = useSettings(initialSettings);
  const locale = useLocalization(initialMessages);
  const content = useContent(initialContent);
  const cart = useCart();
  const { showToast } = useToast();

  // ─── UI State ───
  const [cartOpen, setCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // ─── Derived ───
  const t = locale.t;

  // Destructure frequently used values to avoid useMemo dependency issues
  const { activeFilters, toggleFilter } = products;

  // Map products to ProductCard format
  const cardProducts: ProductCardProduct[] = useMemo(
    () =>
      products.products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        image: p.image,
        type: p.type,
        badge: p.badge,
        rating: p.rating,
        sizes: p.sizes,
        notes: p.notes,
        gender: p.gender,
        categories: p.categories,
        tags: p.tags,
        totalStock: p.stock,
      })),
    [products.products],
  );

  // Map filter groups to sidebar format
  const filterSidebarGroups = useMemo(
    () =>
      filters.filterGroups.map((group) => ({
        name: group.name,
        options: group.options.map((opt) => ({
          slug: opt.slug,
          label: opt.label,
        })),
        activeSlugs: activeFilters[group.name] ?? [],
        onToggle: (slug: string) => toggleFilter(group.name, slug),
      })),
    [filters.filterGroups, activeFilters, toggleFilter],
  );

  // Cart items mapped to CartDrawer format
  const cartDrawerItems = useMemo(
    () =>
      cart.items.map((item) => ({
        productId: item.productId,
        sizeLabel: item.sizeLabel,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
        image: item.image,
      })),
    [cart.items],
  );

  // ─── Handlers ───
  const handleAddToCart = (
    product: ProductCardProduct,
    size: { label: string; price: number },
  ) => {
    cart.addItem({
      productId: product.id,
      sizeLabel: size.label,
      price: size.price,
      name: product.name,
      image: product.image,
    });
    showToast(`تمت إضافة ${product.name} إلى السلة`, "success");
  };

  const handleCartCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  return (
    <PageLayout
      headerProps={{
        navItems: settings.navigation,
        cartCount: cart.totalItems,
        onCartClick: () => setCartOpen(true),
      }}
      footerProps={{
        description: settings.footerDescription,
        columns: settings.footerColumns,
      }}
    >
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-l from-[var(--color-accent)] to-[var(--color-accent)]/80 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {content.hero.title || t("home.pageTitle", "Parfums De Foda")}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto">
            {content.hero.description ||
              t("home.pageDescription", "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة")}
          </p>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <section id="main-content" className="container mx-auto px-4 py-8">
        {/* Search + Sort */}
        <div className="flex items-center gap-4 mb-8">
          <SearchBar
            value={products.searchQuery}
            onChange={products.setSearchQuery}
            placeholder={t("home.searchPlaceholder", "ابحث عن عطرك...")}
            className="flex-1 max-w-md"
          />
          <label htmlFor="sort-select" className="sr-only">
            {t("sort.label", "ترتيب المنتجات")}
          </label>
          <select
            id="sort-select"
            value={products.sortBy}
            onChange={(e) =>
              products.setSortBy(
                e.target.value as
                  | "newest"
                  | "price-asc"
                  | "price-desc"
                  | "rating"
                  | "alphabetical"
                  | "featured",
              )
            }
            className="h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--neutral-700)] outline-none focus:border-[var(--color-accent)]"
            aria-label={t("sort.label", "ترتيب المنتجات")}
          >
            <option value="featured">{t("sort.featured", "المميزة")}</option>
            <option value="newest">{t("sort.newest", "الأحدث")}</option>
            <option value="price-asc">{t("sort.priceAsc", "السعر: من الأقل للأعلى")}</option>
            <option value="price-desc">{t("sort.priceDesc", "السعر: من الأعلى للأقل")}</option>
            <option value="rating">{t("sort.rating", "الأعلى تقييماً")}</option>
            <option value="alphabetical">{t("sort.alphabetical", "أبجدي")}</option>
          </select>
        </div>

        {/* Active filters bar */}
        {products.hasActiveFilters && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-[var(--neutral-500)]">
              {t("home.filters", "تصفية")} ({products.activeFilterCount})
            </span>
            <button
              onClick={products.clearFilters}
              className="text-sm text-[var(--color-accent)] hover:underline"
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
            onClearAll={products.clearFilters}
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          <div className="flex-1">
            {cardProducts.length === 0 ? (
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
                products={cardProducts}
                desktopCols={settings.grid.desktop as 1 | 2 | 3 | 4}
                tabletCols={settings.grid.tablet as 1 | 2}
                mobileCols={settings.grid.mobile as 1}
                cardProps={{
                  addToCartLabel: t("home.addToCart", "أضف إلى السلة"),
                  addedLabel: t("home.addedToCart", "✓ تمت الإضافة"),
                  outOfStockLabel: t("home.outOfStock", "غير متوفر"),
                  selectSizeLabel: t("product.selectSize", "اختر الحجم"),
                  onAddToCart: handleAddToCart,
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      {content.faq.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <FaqAccordion
            items={content.faq}
            title={t("faq.title", "الأسئلة الشائعة")}
          />
        </section>
      )}

      {/* ─── Policies ─── */}
      {content.policies.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-[var(--border-default)]">
          <PoliciesAccordion
            sections={content.policies}
            title={t("policies.title", "السياسات")}
          />
        </section>
      )}

      {/* ─── Contact ─── */}
      <section id="contact" className="container mx-auto px-4 py-12 border-t border-[var(--border-default)]">
        <h2 className="text-2xl font-bold text-[var(--neutral-800)] mb-2 text-center">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-6 py-3 text-sm font-medium text-[var(--neutral-700)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-5 w-5" />
              {t("contact.whatsapp", "راسلنا عبر واتساب")}
            </a>
          )}
          {settings.contact.email && (
            <a
              href={`mailto:${settings.contact.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-6 py-3 text-sm font-medium text-[var(--neutral-700)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              <Mail className="h-5 w-5" />
              {t("contact.email", "أرسل لنا بريداً إلكترونياً")}
            </a>
          )}
        </div>
      </section>

      {/* ─── Cart Drawer ─── */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
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
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={handleCartCheckout}
      />
    </PageLayout>
  );
}
