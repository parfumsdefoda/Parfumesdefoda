"use client";

import { AnimatePresence } from "framer-motion";
import {
  ProductCard,
  type ProductCardProduct,
  type ProductCardProps,
} from "./product-card";

export interface ProductGridProps {
  /** Array of products to display */
  products: ProductCardProduct[];
  /** Grid columns on desktop (reads from settings.json) */
  desktopCols?: 1 | 2 | 3 | 4;
  /** Grid columns on tablet */
  tabletCols?: 1 | 2;
  /** Grid columns on mobile */
  mobileCols?: 1;
  /** Passed through to each ProductCard */
  cardProps?: Partial<ProductCardProps>;
  className?: string;
}

/**
 * ProductGrid — responsive grid of ProductCards.
 * Layout: 1 col mobile, 2 col tablet, N col desktop.
 * Pure presentational — receives products via props.
 */
export function ProductGrid({
  products,
  desktopCols = 3,
  tabletCols = 2,
  mobileCols = 1,
  cardProps,
  className,
}: ProductGridProps) {
  const gridCols =
    mobileCols === 1 && tabletCols === 2 && desktopCols === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : mobileCols === 1 && tabletCols === 2 && desktopCols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : desktopCols === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : `grid-cols-${mobileCols} sm:grid-cols-${tabletCols} lg:grid-cols-${desktopCols}`;

  return (
    <div className={`grid ${gridCols} gap-6 ${className ?? ""}`}>
      <AnimatePresence mode="popLayout">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            columns={desktopCols}
            {...cardProps}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
