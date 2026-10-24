import { ProductCard, type ProductCardLabels } from "./product-card";
import type { Product } from "@/types";

export interface ProductGridProps {
  /** Products to display, already filtered and sorted by the server. */
  products: Product[];
  /** Labels passed through to every card. */
  labels?: Partial<ProductCardLabels>;
  className?: string;
}

/**
 * ProductGrid — the catalogue grid.
 *
 * A Server Component: it renders every card into the HTML (all 40 products,
 * for SEO), and the only client code inside is each card's quick-add island.
 */
export function ProductGrid({ products, labels, className }: ProductGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-6 sm:grid-cols-3 ${className ?? ""}`}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          labels={labels}
          // Above-the-fold images: the first row ships with the derived assets
          // and high fetch priority. Everything after stays lazy so a
          // 40-product grid does not fetch 40 images.
          priority={index < 4}
          loading={index < 4 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
