import Link from "next/link";
import { Star } from "lucide-react";
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
import type { FeatureFlags } from "@/types/services";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductCardLabels {
  /** Ink for a product still waiting for its photo. */
  comingSoon: string;
  /** Ink for a sold-out product. */
  outOfStock: string;
  /** Prefix for a multi-size price ("من ١٢٠ ج.م"). */
  from: string;
  /** Accessible name of the quick-add control. */
  add: string;
  /** Toast text after a successful add. `{name}` is replaced. */
  addedToast: string;
  /** Label of the confirm button inside the size chooser. */
  addToCart: string;
  /** Heading of the size chooser. */
  chooseSize: string;
  /** The row button revealed on hover ("إضافة سريعة"). */
  quickAdd: string;
  /** The premium label ("فاخر"). */
  premium: string;
  /** The featured card's full-width button ("أضف للسلة"). */
  addShort?: string;
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
  addShort: "أضف للسلة",
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
  /** Premium (فاخر) treatment is rendered only while the feature flag is on. */
  features?: FeatureFlags;
}

// ─── Image sizes ────────────────────────────────────────────────────────────

/** 2 / 3 / 4 columns up to a 1920px container. */
export const CARD_IMAGE_SIZES = "(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw";

type PhotoClass = "transparent" | "white" | "scene";

/** Contract P: the manifest decides how a photo meets the card. */
function photoClassOf(product: Product): PhotoClass {
  if (!hasProductImage(product)) return "scene";
  const sources = buildProductImageSources(product.slug, "card");
  if (!sources) return "scene";
  if (sources.blend === "multiply") return "white";
  return hasTransparentCutout(product.slug) ? "transparent" : "scene";
}

const PHOTO_CLASS: Record<PhotoClass, string> = {
  transparent: "object-contain [filter:drop-shadow(10px_14px_12px_color-mix(in_srgb,var(--ink)_28%,transparent))]",
  white: "object-contain mix-blend-multiply",
  scene: "object-cover",
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — one cell of the catalogue.
 *
 * Every card is a 2px shell around a 14px inner: the premium shell is the gold
 * gradient with a soft glow, the regular one is transparent with a hairline
 * border, so both rows keep the same height. Premium adds the gradient star
 * badge on the image, an ink/gold full-width add button and a warmer surface;
 * the name and image remain the only links, and the quick-add island stays the
 * only client code.
 */
export function ProductCard({
  product,
  priority = false,
  loading = "lazy",
  deferred = false,
  labels,
  className,
  features,
}: ProductCardProps) {
  const copy = { ...DEFAULT_CARD_LABELS, ...labels };
  const badge = cardBadge(product);
  const comingSoon = badge === "coming-soon";
  const outOfStock = badge === "out-of-stock";
  const hasImage = hasProductImage(product);
  const premium = isPremiumProduct(product, features);
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
        "group relative rounded-[16px] p-[2px]",
        premium
          ? "pf-gold-surface pf-gold-glow"
          : "bg-transparent transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[14px] border",
          premium
            ? "border-transparent bg-[image:var(--premium-surface)]"
            : "border-[var(--boutique-line)] bg-[var(--boutique-white)]",
        )}
      >
        {/* ─── Image box ─── */}
        <div data-card-stage="" className="relative aspect-square w-full overflow-hidden">
          {comingSoon ? (
            <span className="absolute inset-0 grid place-items-center text-[14px] font-medium text-[var(--boutique-ink)]/60">
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
                "size-full transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.03] motion-reduce:transform-none",
                PHOTO_CLASS[photo],
                outOfStock && "opacity-60",
              )}
            />
          )}

          {premium && (
            <span
              data-premium-badge=""
              className="pf-gold-surface absolute top-3 start-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold text-[var(--boutique-ink)]"
            >
              <Star aria-hidden="true" className="size-3.5 fill-current" />
              {copy.premium}
            </span>
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
        <div className={cn("flex flex-1 flex-col px-3 pb-4 pt-4", premium && "px-3.5")}>
          <div className="flex flex-col items-center gap-1 text-center">
            <h3
              className={cn(
                "line-clamp-2 leading-snug",
                premium
                  ? "text-[17px] font-bold"
                  : "text-[15px] font-semibold",
                outOfStock || comingSoon ? "text-[var(--boutique-ink)]/60" : "text-[var(--boutique-ink)]",
              )}
            >
              {href ? (
                <Link
                  href={href}
                  className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {product.name}
                </Link>
              ) : (
                product.name
              )}
            </h3>

            {price ? (
              <p
                data-card-price=""
                className={cn(
                  "text-[14px]",
                  premium
                    ? "font-medium text-[var(--gold-700)]"
                    : "font-medium text-[var(--boutique-ink)]/70",
                )}
              >
                {price.prefix && <span className="me-1">{price.prefix}</span>}
                <span className="whitespace-nowrap tabular-nums">{formatPrice(price.amount)}</span>
              </p>
            ) : (
              outOfStock && (
                <p className="text-[14px] font-medium text-[var(--boutique-ink)]/70">
                  {copy.outOfStock}
                </p>
              )
            )}
          </div>

          {/* Regular cards reserve the hover row; featured always shows its button. */}
          <div
            data-card-action=""
            className={cn(
              "flex items-center justify-center",
              premium ? "mt-auto pt-3" : "mt-2 h-11",
            )}
          >
            {canAdd && (
              <QuickAdd
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.image,
                }}
                sizes={product.sizes}
                variant={premium ? "featured" : "compact"}
                labels={{
                  add: copy.add,
                  addedToast: copy.addedToast,
                  addToCart: copy.addToCart,
                  chooseSize: copy.chooseSize,
                  quickAdd: copy.quickAdd,
                  addShort: copy.addShort,
                }}
                className={cn(
                  premium
                    ? "mt-auto w-full"
                    : [
                        "flex w-full justify-center",
                        "opacity-0 transition-opacity duration-200 ease-[var(--ease-apple)] motion-reduce:transition-none",
                        "group-hover:opacity-100 group-focus-within:opacity-100",
                        "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
                        "[@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100",
                      ],
                )}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
