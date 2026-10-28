"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/features/toast";
import { Button } from "@/components/ui/button";
import { formatPrice, formatSizeLabel } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Product, ProductSize } from "@/types";

export interface ProductPurchaseLabels {
  chooseSize: string;
  addToCart: string;
  /** Toast template — `{name}` is replaced. */
  addedToast: string;
  inStock: string;
  outOfStock: string;
  /** Accessible name while a size is disabled: "50 مل — غير متوفر". */
  sizeUnavailable: string;
}

export interface ProductPurchaseProps {
  product: Pick<Product, "id" | "slug" | "name" | "image" | "sizes">;
  /** The catalogue's own short description, shown between price and size. */
  description?: string;
  labels: ProductPurchaseLabels;
}

/**
 * ProductPurchase — everything on a product page that needs state.
 *
 * One island owns the selected size, because three things must agree on it:
 * the price, the availability line, and the add-to-cart line. The sticky bar is
 * part of the same island for the same reason — it always names the size that
 * would actually be bought.
 *
 * The size control is a real radiogroup: one tab stop, arrow keys move the
 * selection (RTL: left is forward), Home/End jump to the ends.
 */
export function ProductPurchase({
  product,
  description,
  labels,
}: ProductPurchaseProps) {
  const cart = useCart();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string>(() => {
    const firstInStock = product.sizes.find((size) => size.inStock);
    return firstInStock?.label ?? product.sizes[0]?.label ?? "";
  });

  const chosen =
    product.sizes.find((size) => size.label === selected) ?? null;
  const buyable = product.sizes.filter((size) => size.inStock);
  const canBuy = chosen !== null && chosen.inStock;

  const [ctaPast, setCtaPast] = useState(false);
  const [footerReachedBar, setFooterReachedBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const radios = useRef<Array<HTMLButtonElement | null>>([]);

  // The bar is a convenience for the phone, not a second checkout: it appears
  // only once the real CTA has scrolled away, and never on a desktop layout.
  //
  // The position is read from geometry rather than latched from an
  // IntersectionObserver crossing: the observer only reports the moment the
  // CTA *leaves* the root (bottom ≈ +64 there, never < 0), so a latch is
  // evaluated once and stays wrong. Reading the rect on each frame is exact at
  // any scroll position, including a jump or a restored scroll.
  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof window === "undefined") return;

    let frame = 0;
    const evaluate = () => {
      frame = 0;
      // "Past" means scrolled *above* the viewport — not merely out of it.
      // A CTA that is still below the fold must not raise the bar.
      setCtaPast(node.getBoundingClientRect().bottom < 0);
      const footer = document.querySelector<HTMLElement>("[data-page-end]");
      const bar = stickyBarRef.current;
      setFooterReachedBar(
        Boolean(
          footer &&
            bar &&
            footer.getBoundingClientRect().top <=
              window.innerHeight - bar.getBoundingClientRect().height,
        ),
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(evaluate);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const showBar = ctaPast && !footerReachedBar;

  const add = useCallback(() => {
    if (!chosen || !chosen.inStock) return;
    cart.addItem({
      productId: product.id,
      slug: product.slug,
      sizeLabel: chosen.label,
      price: chosen.price,
      name: product.name,
      image: product.image,
    });
    showToast(labels.addedToast.replace("{name}", product.name), "success");
    cart.openDrawer();
  }, [cart, chosen, labels.addedToast, product, showToast]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key) || buyable.length === 0) return;
    event.preventDefault();

    const current = buyable.findIndex((size) => size.label === selected);
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buyable.length - 1;
    else {
      const forward = event.key === "ArrowDown" || event.key === "ArrowLeft";
      const step = forward ? 1 : -1;
      const from = current === -1 ? (step === 1 ? -1 : 0) : current;
      next = (from + step + buyable.length) % buyable.length;
    }

    const target = buyable[next];
    setSelected(target.label);
    radios.current[product.sizes.indexOf(target)]?.focus();
  };

  const price = chosen ? formatPrice(chosen.price) : null;

  return (
    <>
      {/* Price — the selected size's, never a range the store cannot honour. */}
      {price && (
        <p
          aria-live="polite"
          className="text-title-3 font-bold text-[var(--color-brand)] tabular-nums"
        >
          {price}
        </p>
      )}

      {description && (
        <p className="line-clamp-3 text-body text-[var(--color-text-muted)]">
          {description}
        </p>
      )}

      {/* Size selector */}
      <div>
        <p className="mb-2 text-caption font-bold text-[var(--color-text)]">
          {labels.chooseSize}
        </p>
        <div
          role="radiogroup"
          aria-label={labels.chooseSize}
          onKeyDown={handleKeyDown}
          // One row, one column per real size (max four): a 3-size oil gets
          // three equal columns instead of a 3+1 wrap.
          style={{
            gridTemplateColumns: `repeat(${Math.min(product.sizes.length, 4)}, minmax(0, 1fr))`,
          }}
          className="grid gap-2"
        >
          {product.sizes.map((size, index) => {
            const checked = size.label === selected;
            const out = !size.inStock;
            return (
              <SizeOption
                key={size.label}
                size={size}
                checked={checked}
                out={out}
                labels={labels}
                onSelect={() => setSelected(size.label)}
                register={(node) => {
                  radios.current[index] = node;
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Availability — green is status only, never decoration. */}
      {chosen && (
        <p className="flex items-center gap-2 text-caption">
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              canBuy ? "bg-[var(--color-positive)]" : "bg-[var(--color-border-strong)]",
            )}
          />
          <span
            className={
              canBuy
                ? "font-medium text-[var(--color-text)]"
                : "text-[var(--color-text-muted)]"
            }
          >
            {canBuy ? labels.inStock : labels.outOfStock}
          </span>
        </p>
      )}

      <div ref={ctaRef} data-purchase-cta>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={add}
          disabled={!canBuy}
          aria-label={canBuy ? labels.addToCart : labels.outOfStock}
          className="w-full font-bold"
        >
          {canBuy ? labels.addToCart : labels.outOfStock}
        </Button>
      </div>

      {/* Phone-only bar: same size, same price, same line in the cart. */}
      <div
        ref={stickyBarRef}
        data-sticky-bar
        data-visible={showBar ? "true" : "false"}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur md:hidden",
          "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-apple)] motion-reduce:transition-none",
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!showBar}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-caption font-bold text-[var(--color-text)]">
              {product.name}
            </p>
            {chosen && (
              <p className="text-caption text-[var(--color-text-muted)] tabular-nums">
                {formatSizeLabel(chosen.label)} · {price}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={add}
            disabled={!canBuy}
            tabIndex={showBar ? 0 : -1}
            className="shrink-0 font-bold"
          >
            {canBuy ? labels.addToCart : labels.outOfStock}
          </Button>
        </div>
      </div>
    </>
  );
}

interface SizeOptionProps {
  size: ProductSize;
  checked: boolean;
  out: boolean;
  labels: ProductPurchaseLabels;
  onSelect: () => void;
  register: (node: HTMLButtonElement | null) => void;
}

function SizeOption({
  size,
  checked,
  out,
  labels,
  onSelect,
  register,
}: SizeOptionProps) {
  return (
    <button
      ref={register}
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={out}
      tabIndex={checked ? 0 : -1}
      onClick={onSelect}
      aria-label={
        out
          ? `${formatSizeLabel(size.label)} — ${labels.sizeUnavailable}`
          : `${formatSizeLabel(size.label)} ${formatPrice(size.price)}`
      }
      className={cn(
        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-control border px-1 text-caption text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
        checked
          ? "border-[var(--color-brand)] bg-[var(--purple-50)] font-bold text-[var(--color-text)]"
          : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]",
        out && "cursor-not-allowed opacity-50 line-through",
      )}
    >
      <span>{formatSizeLabel(size.label)}</span>
      {!out && (
        <span className="whitespace-nowrap text-caption font-bold tabular-nums">{formatPrice(size.price)}</span>
      )}
    </button>
  );
}
