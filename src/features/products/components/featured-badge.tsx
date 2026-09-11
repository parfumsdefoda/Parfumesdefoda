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
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#b8960c] via-[#d4af37] to-[#f5d060] font-bold leading-none tracking-wider text-white ring-1 ring-[#f5d060]/30 shadow-[0_2px_8px_rgba(212,175,55,0.4)]",
        size === "sm" ? "px-3 py-1 text-[10px]" : "px-3.5 py-1.5 text-xs",
        className,
      )}
    >
      <span aria-hidden="true" className={size === "sm" ? "text-[8px]" : "text-[10px]"}>
        ★
      </span>
      فاخر
    </span>
  );
}
