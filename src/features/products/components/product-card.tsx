"use client";

import { useState, useCallback, useRef, memo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FeaturedBadge } from "./featured-badge";
import { formatPrice } from "@/lib/currency";
import { SHIPPING_FEE } from "@/config/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductSize {
  label: string;
  price: number;
  inStock: boolean;
}

export interface ProductCardProduct {
  id: string;
  slug?: string;
  name: string;
  brand: string;
  image: string;
  type: "شرقي" | "غربي";
  /** Optional short description — shown below product name */
  description?: string;
  badge?: string;
  rating?: number;
  sizes: ProductSize[];
  /** Fragrance notes pyramid */
  notes?: { top?: string[]; middle?: string[]; base?: string[] };
  /** Gender classification */
  gender?: "رجالي" | "نسائي" | "للجنسين";
  /** House (الدار): ديزاينر / نيش / دووب */
  house?: string;
  /** Featured product flag — triggers gold premium card style */
  featured?: boolean;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  /** Grid column count — drives image responsive sizes */
  columns?: 1 | 2 | 3 | 4;
  /** Label for "add to cart" button */
  addToCartLabel?: string;
  /** Label shown briefly after adding */
  addedLabel?: string;
  /** Label for out-of-stock state */
  outOfStockLabel?: string;
  /** Label prefix for size selector */
  selectSizeLabel?: string;
  /** Label shown below price */
  taxIncludedLabel?: string;
  /** Called when user clicks "add to cart" */
  onAddToCart?: (product: ProductCardProduct, size: ProductSize) => void;
  className?: string;
}

// ─── Badge helpers ──────────────────────────────────────────────────────────

/** Maps raw badge strings to Arabic display labels */
function resolveBadgeLabel(badge: string): string {
  const lower = badge.toLowerCase();
  if (lower === "new" || lower === "جديد") return "جديد";
  if (lower === "bestseller" || lower === "best seller" || lower === "الأكثر مبيعاً")
    return "الأكثر مبيعاً";
  if (lower === "niche" || lower === "نيش") return "نيش";
  if (lower === "limited" || lower === "إصدار محدود") return "إصدار محدود";
  return badge;
}

// ─── Image sizes by column count ────────────────────────────────────────────

function getImageSizes(columns: number): string {
  switch (columns) {
    case 1:
      return "(max-width: 640px) 100vw";
    case 2:
      return "(max-width: 640px) 100vw, 50vw";
    case 3:
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
    default:
      return "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";
  }
}

// ─── Button state type ──────────────────────────────────────────────────────

type ButtonState = "idle" | "loading" | "success";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — premium luxury perfume product display.
 *
 * Landscape layout with image on right, content on left (RTL).
 * Features: category badge, product name, short description,
 * size selector pills, price, and add-to-cart button.
 *
 * Pure presentational — all data and callbacks via props.
 * Memoized to prevent unnecessary re-renders in grid.
 */
export const ProductCard = memo(function ProductCard({
  product,
  columns = 3,
  addToCartLabel = "أضف إلى السلة",
  addedLabel = "✓ تمت الإضافة",
  outOfStockLabel = "غير متوفر",
  selectSizeLabel = "اختر الحجم",
  taxIncludedLabel = "شامل الضريبة",
  onAddToCart,
  className,
}: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(
    product.sizes[0] ?? null,
  );
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const timersRef = useRef<{ loading?: ReturnType<typeof setTimeout>; success?: ReturnType<typeof setTimeout> }>({});
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isOutOfStock =
    selectedSize !== null && !selectedSize.inStock;

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "50px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedSize || isOutOfStock || buttonState !== "idle") return;

    setButtonState("loading");
    onAddToCart?.(product, selectedSize);

    // Brief loading pulse then success
    timersRef.current.loading = setTimeout(() => {
      setButtonState("success");
      timersRef.current.success = setTimeout(() => {
        setButtonState("idle");
      }, 1500);
    }, 350);
  }, [selectedSize, isOutOfStock, buttonState, onAddToCart, product]);

  const badgeLabel = product.badge ? resolveBadgeLabel(product.badge) : null;

  // Truncate description to 2 lines
  const shortDescription = product.description
    ? product.description.length > 120
      ? product.description.slice(0, 120).trim() + "..."
      : product.description
    : null;

  const detailHref = product.slug ? `/product/${product.slug}` : null;

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "transition-all duration-500 ease-out",
        "bg-[var(--bg-primary)]",
        "border",
        product.featured
          ? "border-transparent shadow-[0_2px_24px_rgba(212,175,55,0.12)] hover:shadow-[0_16px_48px_rgba(212,175,55,0.3)]"
          : "border-[var(--neutral-100)] shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]",
        product.featured
          ? "hover:-translate-y-1.5 hover:scale-[1.01]"
          : "hover:-translate-y-1",
        // Fade-in animation
        "transition-opacity transition-transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      )}
      style={{
        transitionDuration: "500ms",
        ...(product.featured
          ? {
              backgroundImage:
                "linear-gradient(var(--bg-primary), var(--bg-primary)), linear-gradient(135deg, #b8960c, #d4af37, #f5d060, #d4af37, #b8960c)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }
          : undefined),
      }}
    >
      {/* ─── Image ─── */}
      <div className={cn(
        "relative overflow-hidden",
        product.featured
          ? "bg-gradient-to-b from-[#fdf8e8] to-[var(--bg-primary)]"
          : "bg-[var(--bg-primary)]",
      )}>
        {detailHref ? (
          <Link
            href={detailHref}
            className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            aria-label={product.name}
            tabIndex={-1}
          >
            <div className="aspect-square w-full">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes={getImageSizes(columns)}
                className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                quality={85}
                loading="lazy"
              />
            </div>
          </Link>
        ) : (
          <div className="aspect-square w-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes={getImageSizes(columns)}
              className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              quality={85}
              loading="lazy"
            />
          </div>
        )}

        {/* Badge — top corner */}
        {badgeLabel && (
          <div className="absolute top-3 end-3 z-10">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none tracking-wide",
                badgeLabel === "الأكثر مبيعاً"
                  ? "bg-[var(--color-secondary)] text-white"
                  : badgeLabel === "نيش"
                    ? "border border-[var(--color-accent)]/30 bg-[var(--bg-primary)]/90 text-[var(--color-accent)]"
                    : "bg-[var(--color-gold)] text-white",
              )}
            >
              {badgeLabel}
            </span>
          </div>
        )}

        {/* Featured ribbon — top left */}
        {product.featured && (
          <>
            <div className="absolute top-3 start-3 z-10">
              <FeaturedBadge size="sm" />
            </div>
            {/* Gold shimmer overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f5d060]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-[5]" />
          </>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* House Badge (الدار) */}
        {product.house && (
          <div>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
              product.featured
                ? "bg-[var(--color-gold)]/15 text-[#b8960c]"
                : "bg-[var(--color-gold)]/10 text-[var(--color-gold)]",
            )}>
              {product.house}
            </span>
          </div>
        )}

        {/* Product Name */}
        {detailHref ? (
          <Link
            href={detailHref}
            className={cn(
              "text-lg leading-snug line-clamp-1 hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded",
              product.featured
                ? "font-extrabold tracking-wide text-[var(--neutral-900)]"
                : "font-bold text-[var(--neutral-800)]",
            )}
          >
            {product.name}
          </Link>
        ) : (
          <h3 className={cn(
            "text-lg leading-snug line-clamp-1",
            product.featured
              ? "font-extrabold tracking-wide text-[var(--neutral-900)]"
              : "font-bold text-[var(--neutral-800)]",
          )}>
            {product.name}
          </h3>
        )}

        {/* Short Description */}
        {shortDescription && (
          <div>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-[var(--neutral-300)]">
              وصف المنتج
            </span>
            <p className="text-[13px] leading-relaxed text-[var(--neutral-400)] line-clamp-2">
              {shortDescription}
            </p>
          </div>
        )}

        {/* Size Selector — rounded pills, single row */}
        {product.sizes.length > 0 && (
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-[var(--neutral-300)]">
              {selectSizeLabel}
            </span>
            <div className="flex gap-1.5">
              {product.sizes.map((size) => {
                const isSelected = selectedSize?.label === size.label;
                const sizeOutOfStock = !size.inStock;
                return (
                  <button
                    key={size.label}
                    type="button"
                    disabled={sizeOutOfStock}
                    onClick={() => setSelectedSize(size)}
                    aria-label={`${size.label} — ${formatPrice(size.price)}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex-1 rounded-full py-2 px-1 text-[12px] font-medium whitespace-nowrap",
                      "transition-all duration-300 ease-out",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                      isSelected
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "bg-[var(--bg-secondary)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--color-gold)] hover:text-[var(--neutral-800)]",
                      sizeOutOfStock && "opacity-35 cursor-not-allowed",
                    )}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price */}
        {selectedSize && (
          <div className="mt-auto pt-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={selectedSize.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-block text-2xl font-bold tracking-tight text-[var(--color-accent)] leading-none"
              >
                {formatPrice(selectedSize.price)}
              </motion.span>
            </AnimatePresence>
            <p className="mt-0.5 text-[10px] text-[var(--neutral-400)]">
              {taxIncludedLabel}
            </p>
          </div>
        )}

        {/* Shipping Fee Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-secondary)]/10 px-2.5 py-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]" />
          <span className="text-[11px] font-medium text-[var(--color-secondary)]">
            مصاريف الشحن {formatPrice(SHIPPING_FEE)} فقط
          </span>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock || !selectedSize || buttonState !== "idle"}
          variant="default"
          className={cn(
            "h-10 w-full rounded-full text-[13px] font-semibold",
            "bg-[var(--color-secondary)] text-white",
            "hover:bg-[var(--color-accent)] hover:text-white",
            "transition-all duration-300",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
            buttonState === "success" &&
              "!bg-[var(--color-success)] !text-white hover:!bg-[var(--color-success)]",
          )}
          aria-label={
            isOutOfStock
              ? outOfStockLabel
              : buttonState === "success"
                ? addedLabel
                : addToCartLabel
          }
        >
          {isOutOfStock ? (
            outOfStockLabel
          ) : buttonState === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{addToCartLabel}</span>
            </span>
          ) : buttonState === "success" ? (
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>{addedLabel}</span>
            </span>
          ) : (
            addToCartLabel
          )}
        </Button>
      </div>
    </article>
  );
});
