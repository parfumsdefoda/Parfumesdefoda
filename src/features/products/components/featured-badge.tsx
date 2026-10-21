import { Badge } from "@/components/ui/badge";
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
 * never drift out of sync again. It is the shared Badge `gold` variant:
 * gold-50 tint with gold-700 text (5.1:1), never white-on-gold.
 *
 * Purely presentational — safe in both server and client component trees.
 */
export function FeaturedBadge({ size = "sm", className }: FeaturedBadgeProps) {
  return (
    <Badge
      variant="gold"
      className={cn(size === "md" ? "px-3 py-1.5" : "px-2.5 py-1", className)}
    >
      <span aria-hidden="true">★</span>
      فاخر
    </Badge>
  );
}
