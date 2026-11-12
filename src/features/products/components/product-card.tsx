import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { QuickAdd } from "./quick-add";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import {
  cardBadge,
  cardPrice,
  hasAnyStock,
  hasProductImage,
  isPremiumProduct,
} from "@/lib/card-presentation";
import type { Product } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductCardLabels {
  /** Ink for a product still waiting for its photo. */
  comingSoon: string;
  /** Ink for a sold-out product. */
  outOfStock: string;
  /** Prefix for a multi-size price (\"من ١٢٠ ج.م\"). */
  from: string;
  /** Small premium label above the name. */
  premium?: string;
  /** Accessible name of the quick-add control. */
  add: string;
  /** Toast text after a successful add. `{name}` is replaced. */
  addedToast: string;
  /** Label of the confirm button inside the size chooser. */
  addToCart: string;
  /** Heading of the size chooser. */
  chooseSize: string;
  /** The word the quick-add control carries (\"إضافة سريعة\"). */
  quickAdd: string;
}

export const DEFAULT_CARD_LABELS: ProductCardLabels = {
  comingSoon: "قريبًا",
  outOfStock: "غير متوفر",
  from: "من",
  premium: "فاخر",
  add: "أضف إلى السلة",
  addedToast: "تمت إضافة {name} إلى السلة",
  addToCart: "أضف إلى السلة",
  chooseSize: "اختر الحجم",
  quickAdd: "إضافة سريعة",
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
export const CARD_IMAGE_SIZES = "(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — the catalogue's only product unit.
 *
 * Deliberately a Server Component: it renders to HTML with no JavaScript of
 * its own. The one interactive part (quick add) is a small client island, so a
 * grid of 40 products no longer hydrates 40 stateful cards.
 *
 * Anatomy, in the editorial language:
 *   cell       → the grid draws the hairline; the card itself has no frame,
 *                no radius and no shadow
 *   stage      → the product stands on the same paper as the page with a soft
 *                cast shadow; nothing else is visible
 *   text       → the NAME (15px/600) and the PRICE (14px/500, ink) only. The
 *                tier/style meta line lives on the PDP, not here.
 *   premium    → a 1px gold inset frame and a small diamond label, nothing more
 *
 * The image is covered by an absolutely positioned link so the whole stage is
 * clickable; quick add is a *sibling* of that link, never nested in it.
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
  const premium = isPremiumProduct(product);
  const premiumMuted = premium && (comingSoon || outOfStock);
  const price = comingSoon ? null : cardPrice(product, copy.from);
  const href = product.slug ? `/product/${product.slug}` : null;

  return (
    <article
      data-card=""
      data-card-state={comingSoon || outOfStock ? "static" : "live"}
      className={cn(
        "card-shell group relative flex flex-col bg-[var(--paper)] p-4 pb-6 md:p-6",
        deferred && "[content-visibility:auto] [contain-intrinsic-size:auto_34rem]",
        className,
      )}
    >
      {/* ─── Stage ─── */}
      <div className="relative">
        <div
          className="relative flex aspect-[4/5] items-center justify-center overflow-hidden lg:aspect-[1/1.05]"
          data-premium={premium ? (premiumMuted ? "muted" : "true") : undefined}
        >
          {comingSoon ? (
            <span className="border border-dashed border-[var(--line)] px-4 py-1.5 text-[14px] font-medium text-[var(--ink-muted)]">
              {copy.comingSoon}
            </span>
          ) : !hasImage ? (
            <div aria-hidden="true" className="size-full" />
          ) : (
            <ProductImage
              slug={product.slug}
              src={product.image}
              name={product.name}
              tier="card"
              frame="stage"
              tone="light"
              sizes={CARD_IMAGE_SIZES}
              priority={priority}
              loading={loading}
              frameClassName="flex h-[62%] w-full items-center justify-center transition-transform duration-[500ms] ease-[var(--ease-apple)] group-hover:scale-[1.03] group-focus-within:scale-[1.03] motion-reduce:transform-none"
              className={cn(
                "cast-shadow max-h-full w-auto object-contain mix-blend-multiply",
                outOfStock && "opacity-60",
              )}
            />
          )}

          {/* Premium: a hairline frame, inset, sharp corners. Nothing else. */}
          {premium && (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-[10px] border border-[var(--brand-gold)]",
                premiumMuted && "opacity-40",
              )}
            />
          )}

          {href && !comingSoon && (
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 z-10 focus-visible:outline-none"
            />
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
              quickAdd: copy.quickAdd,
            }}
          />
        )}
      </div>

      {/* ─── Text: the name and the price, centred, nothing else ─── */}
      <div className="flex flex-1 flex-col items-center gap-1 pt-5 text-center">
        {premium && !premiumMuted && (
          <span className="text-[14px] font-medium text-[var(--color-gold-text)]">
            ◆ {copy.premium}
          </span>
        )}

        <h3
          className={cn(
            "text-[15px] font-semibold leading-snug",
            outOfStock || comingSoon ? "text-[var(--ink-muted)]" : "text-[var(--ink)]",
          )}
        >
          {href ? (
            <Link
              href={href}
              className="card-name line-clamp-2 hover:underline hover:decoration-[var(--color-brand)] hover:decoration-1 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              {product.name}
            </Link>
          ) : (
            <span className="line-clamp-2">{product.name}</span>
          )}
        </h3>

        {price ? (
          <p className="text-[14px] font-medium text-[var(--ink)]">
            {price.prefix && <span className="me-1 text-[var(--ink-muted)]">{price.prefix}</span>}
            <span className="whitespace-nowrap tabular-nums">{formatPrice(price.amount)}</span>
          </p>
        ) : (
          outOfStock && <p className="text-[14px] font-medium text-[var(--ink-muted)]">{copy.outOfStock}</p>
        )}
      </div>
    </article>
  );
}
