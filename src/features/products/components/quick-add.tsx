"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/features/toast";
import { cn } from "@/lib/utils";
import { quickAddMode } from "@/lib/card-presentation";
import type { ProductSize } from "@/types";

/**
 * The size chooser (popover on desktop, sheet on mobile) is its own chunk:
 * nothing is downloaded until a shopper actually opens it.
 */
const SizeChooser = lazy(() => import("./size-chooser"));

export interface QuickAddProduct {
  id: string;
  slug?: string;
  name: string;
  image: string;
}

export interface QuickAddLabels {
  add: string;
  addToCart: string;
  chooseSize: string;
  /**
   * The word the button grows into a pill on card hover. Decorative next to the
   * button's accessible name, which is always the full "add — product".
   */
  quickAdd: string;
  /** Toast template — `{name}` is replaced with the product name. */
  addedToast: string;
  /** The featured card's full-width label. */
  addShort?: string;
}

export interface QuickAddProps {
  product: QuickAddProduct;
  sizes: ProductSize[];
  labels: QuickAddLabels;
  /** `featured` is the always-visible full-width button of a premium card. */
  variant?: "compact" | "featured";
  className?: string;
}

/**
 * QuickAdd — the only client-side JavaScript on a product card.
 *
 * One size in stock → the item is added immediately (the existing cart path:
 * identity is `productId + sizeLabel`). Several → a chooser opens, mounted
 * lazily, with the out-of-stock sizes disabled. Nothing in stock → the parent
 * card does not render this at all.
 */
export function QuickAdd({
  product,
  sizes,
  labels,
  variant = "compact",
  className,
}: QuickAddProps) {
  const featured = variant === "featured";
  const cart = useCart();
  const { showToast } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserMode, setChooserMode] = useState<"popover" | "sheet">("popover");
  const [justAdded, setJustAdded] = useState(false);

  const mode = quickAddMode(sizes);

  const announceAdded = useCallback(() => {
    setJustAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1500);
  }, []);

  const addSize = useCallback(
    (size: Pick<ProductSize, "label" | "price">) => {
      cart.addItem({
        productId: product.id,
        slug: product.slug,
        sizeLabel: size.label,
        price: size.price,
        name: product.name,
        image: product.image,
      });
      showToast(labels.addedToast.replace("{name}", product.name), "success");
      announceAdded();
      setChooserOpen(false);
      // Show the shopper what just happened: the same drawer the header opens.
      cart.openDrawer();
    },
    [announceAdded, cart, labels.addedToast, product, showToast],
  );

  if (mode === "hidden") return null;

  const handleClick = () => {
    if (mode === "direct") {
      const only = sizes.find((size) => size.inStock);
      if (only) addSize(only);
      return;
    }
    // Client-only decision, made after a click — no hydration mismatch.
    setChooserMode(
      window.matchMedia("(min-width: 768px)").matches ? "popover" : "sheet",
    );
    setChooserOpen(true);
  };

  const label = `${labels.add} — ${product.name}`;

  return (
    <div
      className={cn(
        featured
          ? "relative w-full"
          : [
              "absolute bottom-3 start-3 z-20",
              "transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
              "md:pointer-events-none md:opacity-0",
              "md:group-hover:pointer-events-auto md:group-hover:opacity-100",
              "md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100",
              "md:focus-within:opacity-100",
            ],
        className,
      )}
    >
      <Button
        ref={buttonRef}
        type="button"
        variant="primary"
        size="md"
        onClick={handleClick}
        aria-label={label}
        aria-haspopup={mode === "chooser" ? "dialog" : undefined}
        aria-expanded={mode === "chooser" ? chooserOpen : undefined}
        className={cn(
          featured
            ? "h-11 w-full rounded-lg bg-[var(--boutique-ink)] px-4 text-[14px] font-bold text-[var(--gold-300)] hover:bg-[var(--gold-700)]"
            : "quick-add-btn rounded-pill shadow-soft",
        )}
      >
        {featured ? (
          <>
            {justAdded ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Plus aria-hidden="true" className="size-4" />
            )}
            <span aria-hidden="true">{labels.addShort ?? "أضف للسلة"}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="quick-add-icon">
              {justAdded ? <Check /> : <Plus />}
            </span>
          </>
        )}
      </Button>

      {chooserOpen && (
        <Suspense fallback={null}>
          <SizeChooser
            mode={chooserMode}
            anchor={buttonRef}
            sizes={sizes}
            labels={{ addToCart: labels.addToCart, chooseSize: labels.chooseSize }}
            onOpenChange={setChooserOpen}
            onSelect={addSize}
          />
        </Suspense>
      )}
    </div>
  );
}
