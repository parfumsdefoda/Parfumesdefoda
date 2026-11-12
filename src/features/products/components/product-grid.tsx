import { CARD_IMAGE_SIZES, ProductCard, type ProductCardLabels } from "./product-card";
import { buildProductImageSources } from "@/lib/product-image";
import { hasProductImage } from "@/lib/card-presentation";
import { orderForCatalog } from "@/lib/catalog-order";
import type { GridColumns } from "@/lib/grid-columns";
import type { Product } from "@/types";

export interface ProductGridProps {
  /** Products to display, already filtered and sorted. */
  products: Product[];
  /**
   * Column counts from data/settings.json. The design system's shape is
   * 2 / 3 / 4 with a 12px phone gap that opens to 24px from 640px.
   */
  columns?: GridColumns;
  labels?: Partial<ProductCardLabels>;
  className?: string;
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
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

const DESKTOP_COLS: Record<GridColumns["desktop"], string> = {
  1: "min-[1100px]:grid-cols-1",
  2: "min-[1100px]:grid-cols-2",
  3: "min-[1100px]:grid-cols-3",
  4: "min-[1100px]:grid-cols-4",
};

const DEFAULT_COLUMNS: GridColumns = { mobile: 2, tablet: 3, desktop: 4 };

/**
 * ProductGrid — the catalogue grid.
 *
 * A Server Component: it renders every card into the HTML (all products, for
 * SEO), and the only client code inside is each card's quick-add island.
 * Sold-out and photo-pending products sink below the buyable ones whatever the
 * shopper sorted by.
 */
export function ProductGrid({
  products,
  columns = DEFAULT_COLUMNS,
  labels,
  className,
}: ProductGridProps) {
  const ordered = orderForCatalog(products);
  // The first card is the mobile LCP element on a catalogue page. It is already
  // eager + high priority, but the browser only discovers it while parsing the
  // body; a head preload removes that delay on a slow connection.
  const first = ordered[0];
  const firstSources = first && hasProductImage(first) ? buildProductImageSources(first.slug, "card") : null;

  return (
    <div
      className={[
        "grid grid-cols-2 gap-0 border-t border-s border-[var(--line)] md:grid-cols-3 min-[1100px]:grid-cols-4",
        MOBILE_COLS[columns.mobile] ?? MOBILE_COLS[2],
        TABLET_COLS[columns.tablet] ?? TABLET_COLS[3],
        DESKTOP_COLS[columns.desktop] ?? DESKTOP_COLS[4],
        className ?? "",
      ].join(" ")}
    >
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
          // Above-the-fold images: the first row ships with the derived assets
          // and high fetch priority. Everything after stays lazy so a
          // 40-product grid does not fetch 40 images.
          priority={index < 4}
          loading={index < 4 ? "eager" : "lazy"}
          // Off-screen cards skip layout and paint until scrolled to.
          deferred={index >= 4}
          // The grid is drawn by the cells: 1px inline-end and block-end,
          // so an incomplete last row ends on paper, never on a dark gap.
          className="border-b border-e border-[var(--line)]"
        />
      ))}
    </div>
  );
}
