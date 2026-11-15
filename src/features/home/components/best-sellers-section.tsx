import { ProductGrid, type ProductCardLabels } from "@/features/products";
import type { Product } from "@/types";

export interface BestSellersSectionProps {
  products: Product[];
  labels: {
    title: string;
    card: ProductCardLabels;
  };
}

/**
 * BestSellersSection — the homepage's eight best-selling products.
 *
 * The same hairline grid the catalogue uses, at 2 columns on phones and 4 from
 * xl: no scroll rail, no peeking card, no separate mobile card. The title is
 * kept for the outline but is not drawn — the intro bar above already names the
 * page, and a second heading would only repeat it.
 */
export function BestSellersSection({ products, labels }: BestSellersSectionProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="best-sellers-heading" className="overflow-x-clip bg-[var(--paper)]">
      <h2 id="best-sellers-heading" className="sr-only">
        {labels.title}
      </h2>
      <ProductGrid products={products.slice(0, 8)} labels={labels.card} />
    </section>
  );
}
