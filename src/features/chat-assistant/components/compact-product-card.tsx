"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import type { ChatProduct } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompactProductCardProps {
  product: ChatProduct;
  onAddToCart?: (product: ChatProduct, sizeLabel: string, price: number) => void;
}

type ButtonState = "idle" | "loading" | "success";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CompactProductCard — a small product card for inline chat recommendations.
 *
 * Shows: image, name, price, size selector, and add-to-cart button.
 * Much more compact than the full ProductCard — designed for chat bubbles.
 */
export function CompactProductCard({ product, onAddToCart }: CompactProductCardProps) {
  const inStockSizes = product.sizes.filter((s) => s.inStock);
  const [selectedSize, setSelectedSize] = useState(
    inStockSizes[0] ?? product.sizes[0],
  );
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const timerRef = useRef<{ loading?: ReturnType<typeof setTimeout>; success?: ReturnType<typeof setTimeout> }>({});

  const isOutOfStock = !selectedSize?.inStock;

  const handleAddToCart = useCallback(() => {
    if (!selectedSize || isOutOfStock || buttonState !== "idle") return;

    setButtonState("loading");
    onAddToCart?.(product, selectedSize.label, selectedSize.price);

    timerRef.current.loading = setTimeout(() => {
      setButtonState("success");
      timerRef.current.success = setTimeout(() => {
        setButtonState("idle");
      }, 1500);
    }, 350);
  }, [selectedSize, isOutOfStock, buttonState, onAddToCart, product]);

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl border",
        "border-[var(--neutral-100)] bg-[var(--bg-primary)]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
        "w-full max-w-[280px]",
      )}
    >
      {/* Product Image */}
      <div className="relative h-24 w-24 shrink-0 bg-[var(--bg-secondary)]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="96px"
          className="object-contain p-2"
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

        {/* Size selector — tiny pills */}
        {inStockSizes.length > 0 && (
          <div className="flex gap-1">
            {inStockSizes.map((size) => (
              <button
                key={size.label}
                type="button"
                onClick={() => setSelectedSize(size)}
                aria-pressed={selectedSize?.label === size.label}
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]",
                  selectedSize?.label === size.label
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--bg-secondary)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)]",
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        )}

        {/* Price + Add button row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {selectedSize && (
            <span className="text-sm font-bold text-[var(--color-accent)] leading-none">
              {formatPrice(selectedSize.price)}
            </span>
          )}

          <Button
            size="xs"
            onClick={handleAddToCart}
            disabled={isOutOfStock || buttonState !== "idle"}
            className={cn(
              "h-6 rounded-full px-2 text-[10px] font-semibold",
              "bg-[var(--color-secondary)] text-white",
              "hover:bg-[var(--color-accent)]",
              "transition-all duration-200",
              buttonState === "success" && "!bg-[var(--color-success)]",
            )}
            aria-label={isOutOfStock ? "غير متوفر" : buttonState === "success" ? "تمت الإضافة" : "أضف للسلة"}
          >
            {isOutOfStock ? (
              "غير متوفر"
            ) : buttonState === "loading" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : buttonState === "success" ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              "أضف للسلة"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
