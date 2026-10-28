"use client";

import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";
import { formatPrice, formatSizeLabel } from "@/lib/currency";
import type { ChatProduct } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompactProductCardProps {
  product: ChatProduct;
  /** Fired on click (before navigation) — used to minimize the chat window */
  onClick?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CompactProductCard — a small product card for inline chat recommendations.
 *
 * Self-contained: links to the product detail page where the customer can
 * choose a size and add to cart. No cart/toast provider dependencies —
 * the whole chat feature renders independently of the app's provider tree.
 *
 * Shows: image, name, brand, starting price, and available size count.
 */
export function CompactProductCard({ product, onClick }: CompactProductCardProps) {
  const inStockSizes = product.sizes.filter((s) => s.inStock);
  const minPrice =
    inStockSizes.length > 0
      ? Math.min(...inStockSizes.map((s) => s.price))
      : product.sizes[0]?.price;

  return (
    <Link
      href={`/product/${product.slug}`}
      onClick={onClick}
      className={cn(
        "group flex overflow-hidden rounded-xl border text-start",
        "border-[var(--neutral-100)] bg-[var(--bg-primary)]",
        "shadow-soft",
        "w-full max-w-[280px]",
        "transition-all duration-200",
        "hover:border-[var(--color-accent)]/40 hover:shadow-lifted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
      )}
      aria-label={`${product.name} — ${minPrice !== undefined ? formatPrice(minPrice) : ""} — عرض المنتج`}
    >
      {/* Product Image */}
      <div className="relative h-24 w-24 shrink-0">
        <ProductImage
          slug={product.slug}
          src={product.image}
          name={product.name}
          tier="card"
          frame="thumb"
          sizes="96px"
          decorative
          className="p-1 transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 min-w-0">
        {/* Name & Brand */}
        <div className="min-w-0">
          <p className="text-caption font-bold text-[var(--neutral-800)] line-clamp-1">
            {product.name}
          </p>
          <p className="text-caption text-[var(--neutral-400)] truncate">
            {product.brand}
          </p>
        </div>

        {/* Sizes info */}
        {inStockSizes.length > 0 && (
          <p className="text-caption text-[var(--neutral-400)] truncate">
            {inStockSizes.map((s) => formatSizeLabel(s.label)).join(" · ")}
          </p>
        )}

        {/* Price + View link row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {minPrice !== undefined && (
            <span className="whitespace-nowrap text-caption font-bold text-[var(--color-accent)] tabular-nums">
              {formatPrice(minPrice)}
            </span>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-caption font-medium",
              "bg-[var(--color-brand)] text-white",
              "transition-colors duration-200",
              "group-hover:bg-[var(--purple-700)]",
            )}
          >
            <ArrowUpLeft className="h-3 w-3" aria-hidden="true" />
            عرض المنتج
          </span>
        </div>
      </div>
    </Link>
  );
}