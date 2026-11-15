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
import { buildProductImageSources, hasTransparentCutout } from "@/lib/product-image";
import type { Product } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductCardLabels {
  /** Ink for a product still waiting for its photo. */
  comingSoon: string;
  /** Ink for a sold-out product. */
  outOfStock: string;
  /** Prefix for a multi-size price (\"من ١٢٠ ج.م\"). */
  from: string;
  /** Accessible name of the quick-add control. */
  add: string;
  /** Toast text after a successful add. `{name}` is replaced. */
  addedToast: string;
  /** Label of the confirm button inside the size chooser. */
  addToCart: string;
  /** Heading of the size chooser. */
  chooseSize: string;
  /** The row button revealed on hover (\"إضافة سريعة\"). */
  quickAdd: string;
  /** The premium label (\"فاخر\"). */
  premium: string;
}

export const DEFAULT_CARD_LABELS: ProductCardLabels = {
  comingSoon: "قريبًا",
  outOfStock: "غير متوفر",
  from: "من",
  add: "أضف إلى السلة",
  addedToast: "تمت إضافة {name} إلى السلة",
  addToCart: "أضف إلى السلة",
  chooseSize: "اختر الحجم",
  quickAdd: "إضافة سريعة",
  premium: "فاخر",
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

/** 2 / 3 / 4 columns up to a 1920px container. */
export const CARD_IMAGE_SIZES = "(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw";

type PhotoClass = "transparent" | "white" | "scene";

/** Contract P: the manifest decides how a photo meets the paper. */
function photoClassOf(product: Product): PhotoClass {
  if (!hasProductImage(product)) return "scene";
  const sources = buildProductImageSources(product.slug, "card");
  if (!sources) return "scene";
  if (sources.blend === "multiply") return "white";
  // A derived cut-out is transparent when it is not multiplied and the
  // manifest keeps the original alpha; `hasTransparentCutout` is that flag.
  return hasTransparentCutout(product.slug) ? "transparent" : "scene";
}

const PHOTO_CLASS: Record<PhotoClass, string> = {
  transparent: "object-contain [filter:drop-shadow(10px_14px_12px_color-mix(in_srgb,var(--ink)_28%,transparent))]",
  white: "object-contain mix-blend-multiply",
  scene: "object-cover",
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — one cell of the gallery.
 *
 * A Server Component: the only client code is the quick-add island in the
 * reserved action slot. Anatomy, top to bottom:
 *
 *   image box    full cell width, 1:1, the subject about 72% of its height
 *   text block   16px 12px: optional \"◆ فاخر\", the name (15/600), the price
 *                (14/500, muted ink), then a 44px slot that stays empty at rest
 *
 * The cell is one link target via an overlay link; the action slot sits above
 * it. Hairlines live on the cell itself (border-inline-end + border-block-end)
 * so an incomplete last row shows paper, never a dark block.
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
  const price = comingSoon ? null : cardPrice(product, copy.from);
  const href = product.slug ? `/product/${product.slug}` : null;
  const photo = photoClassOf(product);
  const canAdd = !comingSoon && !outOfStock && hasAnyStock(product);

  return (
    <article
      data-card=""
      data-card-state={comingSoon || outOfStock ? "static" : "live"}
      data-photo={photo}
      className={cn(
        "group relative flex flex-col bg-[var(--paper)]",
        "border-e border-b border-[var(--line)]",
        deferred && "[content-visibility:auto] [contain-intrinsic-size:auto_28rem]",
        className,
      )}
    >
      {/* ─── Image box: full width, 1:1, no padding ─── */}
      <div data-card-stage="" className="relative aspect-square w-full overflow-hidden">
        {comingSoon ? (
          <span className="absolute inset-0 grid place-items-center text-[14px] font-medium text-[var(--ink-muted)]">
            {copy.comingSoon}
          </span>
        ) : !hasImage ? (
          <span aria-hidden="true" className="block size-full" />
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
            frameClassName="flex size-full items-center justify-center"
            className={cn(
              "size-full transition-transform duration-[500ms] ease-[var(--ease-apple)] group-hover:scale-[1.03] group-focus-within:scale-[1.03] motion-reduce:transform-none",
              PHOTO_CLASS[photo],
              outOfStock && "opacity-60",
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

      {/* ─── Text block ─── */}
      <div className="px-3 py-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            aria-hidden={premium ? undefined : true}
            className={cn(
              "text-[14px] font-medium leading-5 text-[var(--color-gold-text)]",
              premium ? "" : "invisible",
            )}
          >
            ◆ {copy.premium}
          </span>

          <h3
            className={cn(
              "line-clamp-2 text-[15px] font-semibold leading-snug",
              outOfStock || comingSoon ? "text-[var(--ink-muted)]" : "text-[var(--ink)]",
            )}
          >
            {href ? (
              <Link
                href={href}
                className="group-hover:underline group-hover:decoration-[var(--color-brand)] group-hover:decoration-1 group-hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                {product.name}
              </Link>
            ) : (
              product.name
            )}
          </h3>

          {price ? (
            <p data-card-price="" className="text-[14px] font-medium text-[var(--ink-muted)]">
              {price.prefix && <span className="me-1">{price.prefix}</span>}
              <span className="whitespace-nowrap tabular-nums">{formatPrice(price.amount)}</span>
            </p>
          ) : (
            outOfStock && (
              <p className="text-[14px] font-medium text-[var(--ink-muted)]">{copy.outOfStock}</p>
            )
          )}
        </div>

        {/* The slot is reserved at rest so hovering moves nothing. */}
        <div data-card-action="" className="mt-2 flex h-11 items-center justify-center">
          {canAdd && (
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
              className={cn(
                "flex w-full justify-center",
                "opacity-0 transition-opacity duration-200 ease-[var(--ease-apple)] motion-reduce:transition-none",
                "group-hover:opacity-100 group-focus-within:opacity-100",
                "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
                // Touch never hides it: there is no hover to reveal it with.
                "[@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100",
              )}
            />
          )}
        </div>
      </div>

      {/* ─── Premium: one gold hairline, inset 10px, around the whole cell ─── */}
      {premium && (
        <span
          aria-hidden="true"
          data-premium-frame=""
          className="pointer-events-none absolute inset-[10px] border border-[var(--brand-gold)]"
        />
      )}
    </article>
  );
}
