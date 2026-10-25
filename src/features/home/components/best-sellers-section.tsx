import Link from "next/link";
import { ProductCard, type ProductCardLabels } from "@/features/products";
import type { Product } from "@/types";

export interface BestSellersSectionProps {
  products: Product[];
  labels: {
    title: string;
    viewAll: string;
    card: ProductCardLabels;
  };
}

/**
 * BestSellersSection — the homepage product row.
 *
 * Ordered by the sales counts the order route keeps (see lib/best-sellers),
 * falling back to the catalogue's own featured flag when those counts are
 * absent. Four columns on desktop; on phones it is a scroll-snap rail that
 * peeks the next card instead of a cramped grid.
 *
 * The cards are the same Server Components the catalogue uses — no second card
 * implementation, and no JavaScript per card beyond the quick-add island.
 */
export function BestSellersSection({
  products,
  labels,
}: BestSellersSectionProps) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="best-sellers-heading"
      className="mx-auto w-full max-w-[1280px] px-4 py-[var(--space-section)]"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2
          id="best-sellers-heading"
          className="text-title-2 font-bold text-[var(--color-text)]"
        >
          {labels.title}
        </h2>
        <Link
          href="/shop"
          className="text-caption font-bold text-[var(--color-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          {labels.viewAll}
        </Link>
      </div>

      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0"
        aria-label={labels.title}
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            className="w-[72%] shrink-0 snap-start md:w-auto md:shrink"
          >
            <ProductCard
              product={product}
              labels={labels.card}
              priority={index < 2}
              loading={index < 2 ? "eager" : "lazy"}
              deferred={index >= 4}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
