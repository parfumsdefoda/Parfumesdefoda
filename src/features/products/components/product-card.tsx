import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { FeaturedBadge } from "./featured-badge";
import { QuickAdd } from "./quick-add";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import {
  cardBadge,
  cardMetaLine,
  cardPrice,
  hasAnyStock,
  hasProductImage,
} from "@/lib/card-presentation";
import type { Product } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductCardLabels {
  /** Ink for a product still waiting for its photo. */
  comingSoon: string;
  /** Ink for a sold-out product. */
  outOfStock: string;
  /** Prefix for a multi-size price ("من ١٢٠ ج.م"). */
  from: string;
  /** Accessible name of the round quick-add control. */
  add: string;
  /** Toast text after a successful add. `{name}` is replaced. */
  addedToast: string;
  /** Label of the confirm button inside the size chooser. */
  addToCart: string;
  /** Heading of the size chooser. */
  chooseSize: string;
}

export const DEFAULT_CARD_LABELS: ProductCardLabels = {
  comingSoon: "قريبًا",
  outOfStock: "غير متوفر",
  from: "من",
  add: "أضف إلى السلة",
  addedToast: "تمت إضافة {name} إلى السلة",
  addToCart: "أضف إلى السلة",
  chooseSize: "اختر الحجم",
};

export interface ProductCardProps {
  product: Product;
  /** Above-the-fold card: eager image with high fetch priority. */
  priority?: boolean;
  loading?: "eager" | "lazy";
  /** Below-the-fold cards skip off-screen layout/paint work. */
  deferred?: boolean;
  labels?: Partial<ProductCardLabels>;
  className?: string;
}

// ─── Image sizes ────────────────────────────────────────────────────────────

/**
 * The grid is fixed at 2 / 3 / 4 columns, so one `sizes` string describes every
 * card on the page: half the viewport on phones, a third on tablets, a quarter
 * on wide screens.
 */
const CARD_IMAGE_SIZES =
  "(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — the catalogue's only product unit.
 *
 * Deliberately a Server Component: it renders to HTML with no JavaScript of
 * its own. The one interactive part (quick add) is a small client island, so a
 * grid of 40 products no longer hydrates 40 stateful cards.
 *
 * Anatomy (RTL):
 *   image stage (4:5, muted surface, one optional badge)
 *   meta line  → tier · style · concentration
 *   name       → the card's real link
 *   price      → brand purple, "من" when several sizes exist
 *
 * The image itself is covered by an absolutely positioned link so the whole
 * stage is clickable; quick add is a *sibling* of that link, never nested in it.
 */
export function ProductCard({
  product,
  priority = false,
  loading = "lazy",
  deferred = false,
  labels,
  className,
}: ProductCardProps) {
  const copy = { ...DEFAULT_CARD_LABELS, ...labels };
  const badge = cardBadge(product);
  const comingSoon = badge === "coming-soon";
  const outOfStock = badge === "out-of-stock";
  const hasImage = hasProductImage(product);
  const price = comingSoon ? null : cardPrice(product, copy.from);
  const meta = cardMetaLine(product);
  const href = product.slug ? `/product/${product.slug}` : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        deferred && "[content-visibility:auto] [contain-intrinsic-size:auto_32rem]",
        className,
      )}
    >
      {/* ─── Stage ─── */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-card">
          {comingSoon ? (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-[var(--color-surface-muted)]">
              <span className="rounded-pill border border-dashed border-[var(--color-border)] px-4 py-1.5 text-caption font-medium text-[var(--color-text-muted)]">
                {copy.comingSoon}
              </span>
            </div>
          ) : !hasImage ? (
            // No file to point at: keep the geometry, drop the broken icon.
            <div
              aria-hidden="true"
              className="aspect-[4/5] w-full bg-[var(--color-surface-muted)]"
            />
          ) : (
            <ProductImage
              slug={product.slug}
              src={product.image}
              name={product.name}
              tier="card"
              frame="stage"
              sizes={CARD_IMAGE_SIZES}
              priority={priority}
              loading={loading}
              frameClassName={cn(
                "transition-opacity duration-[var(--duration-base)]",
                outOfStock && "opacity-60",
              )}
              className={cn(
                "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-apple)]",
                "group-hover:scale-[1.03] motion-reduce:transform-none",
              )}
            />
          )}

          {href && !comingSoon && (
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 z-10 rounded-card focus-visible:outline-none"
            />
          )}

          {badge === "featured" && (
            <div className="absolute top-3 end-3 z-10">
              <FeaturedBadge />
            </div>
          )}

          {/* Coming soon speaks once, from the stage itself. */}
          {badge === "out-of-stock" && (
            <div className="absolute top-3 end-3 z-10">
              <Badge variant="neutral" className="bg-[var(--bg-primary)]/90">
                {copy.outOfStock}
              </Badge>
            </div>
          )}
        </div>

        {/* Quick add — sibling of the overlay link, never inside it. */}
        {!comingSoon && hasAnyStock(product) && (
          <QuickAdd
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
            }}
            sizes={product.sizes}
            labels={{
              add: copy.add,
              addedToast: copy.addedToast,
              addToCart: copy.addToCart,
              chooseSize: copy.chooseSize,
            }}
          />
        )}
      </div>

      {/* ─── Text ─── */}
      <div className="flex flex-1 flex-col gap-1 pt-3">
        {meta && (
          <p className="text-caption text-[var(--color-text-muted)]">{meta}</p>
        )}

        <h3
          className={cn(
            "text-headline font-bold",
            outOfStock || comingSoon
              ? "text-[var(--color-text-muted)]"
              : "text-[var(--color-text)]",
          )}
        >
          {href ? (
            <Link
              href={href}
              className="line-clamp-2 rounded-control transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {product.name}
            </Link>
          ) : (
            <span className="line-clamp-2">{product.name}</span>
          )}
        </h3>

        {price && (
          <p className="mt-auto text-body font-bold text-[var(--color-brand)]">
            {price.prefix && (
              <span className="me-1 font-medium text-[var(--color-text-muted)]">
                {price.prefix}
              </span>
            )}
            <span className="whitespace-nowrap tabular-nums">
              {formatPrice(price.amount)}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}
