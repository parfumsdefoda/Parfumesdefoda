import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FeaturedBadgeProps {
  /** Badge scale — "sm" for grid cards, "md" for the product detail page. */
  size?: "sm" | "md";
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * FeaturedBadge — the single source of truth for the "فاخر" (luxury) label.
 *
 * Both the product grid card and the product detail page render this component
 * whenever `product.featured === true`, so the label text and gold styling can
 * never drift out of sync again. Change the label or style here, once.
 *
 * Purely presentational — safe in both server and client component trees.
 */
export function FeaturedBadge({ size = "sm", className }: FeaturedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full [background-image:var(--gradient-gold)] font-bold text-white ring-1 ring-[var(--gold-300)]/30 shadow-soft",
        size === "sm" ? "px-3 py-1 text-caption" : "px-3.5 py-1.5 text-caption",
        className,
      )}
    >
      <span aria-hidden="true" className={size === "sm" ? "text-caption" : "text-caption"}>
        ★
      </span>
      فاخر
    </span>
  );
}
