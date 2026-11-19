import { CARD_IMAGE_SIZES, ProductCard, type ProductCardLabels } from "./product-card";
import { HomeGridTrim } from "./home-grid-trim";

/**
 * Pre-paint trim for the homepage grid: runs synchronously during parsing
 * (before first paint), so the 2-row cap lands without any layout shift —
 * the HomeGridTrim island then re-checks on resize. Uses the same
 * offsetTop measurement as the island.
 */
const HOME_TRIM_SCRIPT = `(function(){var g=document.querySelector('[data-home-grid]');if(!g)return;var c=g.querySelectorAll('[data-card]');if(c.length<2)return;var keep;if(window.innerWidth<1024){keep=12}else{var t=c[0].offsetTop;var cols=0;for(var i=0;i<c.length;i++){if(c[i].offsetTop===t)cols++;else break}if(cols<1)cols=1;keep=cols*2}for(var j=keep;j<c.length;j++){c[j].style.display='none'}})();`;
import { buildProductImageSources } from "@/lib/product-image";
import { hasProductImage } from "@/lib/card-presentation";
import { orderForCatalog } from "@/lib/catalog-order";
import type { GridColumns } from "@/lib/grid-columns";
import type { Product } from "@/types";
import type { FeatureFlags } from "@/types/services";

export interface ProductGridProps {
  /** Products to display, already filtered and sorted. */
  products: Product[];
  /**
   * Column counts from data/settings.json, used below 1024px.
   * From 1024px the grid is `repeat(auto-fill, minmax(240px, 1fr))`
   * (~4 @1024, 5 @1280, 6 @1440, 8 @1920 inside the 1920px container).
   */
  columns?: GridColumns;
  labels?: Partial<ProductCardLabels>;
  className?: string;
  features?: FeatureFlags;
  /** Homepage: 12 cards below 1024px, exactly 2 full rows at/above. */
  home?: boolean;
}

/**
 * Static class maps. Tailwind only sees class names that appear literally in
 * the source, so the counts are mapped instead of interpolated.
 */
const MOBILE_COLS: Record<GridColumns["mobile"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
};

const TABLET_COLS: Record<GridColumns["tablet"], string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

const DEFAULT_COLUMNS: GridColumns = { mobile: 2, tablet: 3, desktop: 4 };

/**
 * ProductGrid — the catalogue grid.
 *
 * A Server Component: it renders every card into the HTML (all products, for
 * SEO), and the only client code inside is each card's quick-add island.
 * Sold-out and photo-pending products sink below the buyable ones whatever the
 * shopper sorted by. Mobile (<1024) keeps today's 2/3 columns; desktop
 * (>=1024) uses auto-fill 240px tracks. The 44px action slot, the square
 * image box and the hairline cell contract are unchanged.
 */
export function ProductGrid({
  products,
  columns = DEFAULT_COLUMNS,
  labels,
  className,
  features,
  home = false,
}: ProductGridProps) {
  const ordered = orderForCatalog(products);
  // The first card is the mobile LCP element on a catalogue page. It is already
  // eager + high priority, but the browser only discovers it while parsing the
  // body; a head preload removes that delay on a slow connection.
  const first = ordered[0];
  const firstSources = first && hasProductImage(first) ? buildProductImageSources(first.slug, "card") : null;

  return (
    <div
      data-home-grid={home ? "" : undefined}
      className={[
        "mx-auto grid w-full max-w-[1920px] border-s border-t border-[var(--line)]",
        // Homepage: the trim island keeps 12 below 1024 / 2 rows at/above.
        MOBILE_COLS[columns.mobile] ?? MOBILE_COLS[2],
        TABLET_COLS[columns.tablet] ?? TABLET_COLS[3],
        // Desktop auto-fill (no fixed xl:grid-cols-N): 4 @1024 → 8 @1920.
        "lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]",
        className ?? "",
      ].join(" ")}
    >
      {home && <HomeGridTrim />}
      {firstSources?.avif && (
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imageSrcSet={firstSources.avif}
          imageSizes={CARD_IMAGE_SIZES}
          fetchPriority="high"
        />
      )}

      {ordered.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          labels={labels}
          features={features}
          // Above-the-fold images: the first row ships with the derived assets
          // and high fetch priority. Everything after stays lazy so a
          // 40-product grid does not fetch 40 images.
          priority={index < 4}
          loading={index < 4 ? "eager" : "lazy"}
          // Off-screen cards skip layout and paint until scrolled to.
          deferred={index >= 4}
        />
      ))}
      {home && <script dangerouslySetInnerHTML={{ __html: HOME_TRIM_SCRIPT }} />}
    </div>
  );
}
