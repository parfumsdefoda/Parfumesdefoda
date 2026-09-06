"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import type { ChatProduct } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompactProductCardProps {
  product: ChatProduct;
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
export function CompactProductCard({ product }: CompactProductCardProps) {
  const inStockSizes = product.sizes.filter((s) => s.inStock);
  const minPrice =
    inStockSizes.length > 0
      ? Math.min(...inStockSizes.map((s) => s.price))
      : product.sizes[0]?.price;

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group flex overflow-hidden rounded-xl border text-start",
        "border-[var(--neutral-100)] bg-[var(--bg-primary)]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
        "w-full max-w-[280px]",
        "transition-all duration-200",
        "hover:border-[var(--color-accent)]/40 hover:shadow-[0_6px_20px_rgba(99,41,137,0.12)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
      )}
      aria-label={`${product.name} — ${minPrice !== undefined ? formatPrice(minPrice) : ""} — عرض المنتج`}
    >
      {/* Product Image */}
      <div className="relative h-24 w-24 shrink-0 bg-[var(--bg-secondary)]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="96px"
          className="object-contain p-2 transition-transform duration-200 group-hover:scale-105"
          quality={80}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 min-w-0">
        {/* Name & Brand */}
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold text-[var(--neutral-800)] line-clamp-1 leading-tight">
            {product.name}
          </h4>
          <p className="text-[10px] text-[var(--neutral-400)] truncate">
            {product.brand} · {product.house}
          </p>
        </div>

        {/* Sizes info */}
        {inStockSizes.length > 0 && (
          <p className="text-[10px] text-[var(--neutral-400)] truncate">
            {inStockSizes.map((s) => s.label).join(" · ")}
          </p>
        )}

        {/* Price + View link row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {minPrice !== undefined && (
            <span className="text-sm font-bold text-[var(--color-accent)] leading-none">
              {formatPrice(minPrice)}
            </span>
          )}

          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-semibold",
              "bg-[var(--color-secondary)] text-white",
              "transition-all duration-200",
              "group-hover:bg-[var(--color-accent)]",
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