import { loadProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadFilterData } from "@/services/filters";
import { loadContent } from "@/services/content";
import { loadLocale } from "@/services/localization";
import { getProductSalesCounts } from "@/lib/sales-tracking";
import { HomePageClient } from "@/features/home";

/**
 * Homepage — Parfums De Foda.
 *
 * Server Component that loads ALL data from JSON files using node:fs/promises.
 * Data is passed as props to the client-side HomePageClient component,
 * which handles interactivity (filters, search, sorting, cart, checkout).
 *
 * Product sales counts are fetched server-side from Upstash Redis (best-selling
 * sort). getProductSalesCounts() never throws — if Redis is unreachable it
 * returns an empty object and the homepage renders with the default order.
 *
 * No client-side data fetching. No fetch() calls for local files. All file I/O
 * and Redis access is server-side.
 * Data flow: JSON files → Services → Server Component → Client Component → Hooks → UI
 */
export default async function HomePage() {
  // ─── Load all data server-side ───
  const [products, settings, filterData, content, localeMessages, salesCounts] =
    await Promise.all([
      loadProducts(),
      loadFullSettings(),
      loadFilterData(),
      loadContent(),
      loadLocale(),
      getProductSalesCounts(),
    ]);

  // ─── Server-side error handling ───
  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-[var(--neutral-700)] mb-2">
            عذراً، لا توجد منتجات حالياً
          </h2>
          <p className="text-[var(--neutral-500)]">
            يرجى المحاولة مرة أخرى لاحقاً
          </p>
        </div>
      </div>
    );
  }

  // ─── Render client component with pre-loaded data ───
  return (
    <HomePageClient
      products={products}
      settings={settings}
      filterData={filterData}
      content={content}
      localeMessages={localeMessages}
      salesCounts={salesCounts}
    />
  );
}
