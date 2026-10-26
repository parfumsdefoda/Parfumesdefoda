"use client";

import { Minus, Plus, Trash2, Truck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/currency";
import { ProductImage } from "@/components/product-image";

export interface CartItemData {
  productId: string;
  /** Product slug — resolves the derived image; absent on older carts. */
  slug?: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  name: string;
  image: string;
}

export interface CartDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called to close the drawer */
  onOpenChange: (open: boolean) => void;
  /** Cart items */
  items: CartItemData[];
  /** Label for the sheet title */
  title?: string;
  /** Label when cart is empty */
  emptyTitle?: string;
  /** Description when cart is empty */
  emptyDescription?: string;
  /** Total label */
  totalLabel?: string;
  /** Checkout button label */
  checkoutLabel?: string;
  /** Remove button label */
  removeLabel?: string;
  /** Quantity label */
  quantityLabel?: string;
  /** Label for the item-count line in the drawer description */
  itemsCountLabel?: string;
  /** Empty-cart button label — closes the drawer */
  continueShoppingLabel?: string;
  /**
   * Flat shipping fee from settings. Omit to hide the shipping row.
   * Resolve it with getShippingFee() — never hardcode a fee.
   */
  shippingFee?: number;
  /** Called when quantity changes */
  onUpdateQuantity?: (
    productId: string,
    sizeLabel: string,
    quantity: number,
  ) => void;
  /** Called when item is removed */
  onRemoveItem?: (productId: string, sizeLabel: string) => void;
  /** Called when checkout is clicked */
  onCheckout?: () => void;
  className?: string;
}

/**
 * CartDrawer — slide-in Sheet with cart items, totals, and checkout.
 * Uses Shadcn Sheet (right side); the panel animation is CSS, owned by the
 * Sheet primitive. Pure presentational — all data and callbacks via props.
 */
export function CartDrawer({
  open,
  onOpenChange,
  items,
  title = "سلة التسوق",
  emptyTitle = "سلة التسوق فارغة",
  emptyDescription = "أضف منتجات إلى السلة للمتابعة",
  totalLabel = "المجموع",
  checkoutLabel = "إتمام الطلب",
  removeLabel = "إزالة",
  quantityLabel = "الكمية",
  itemsCountLabel = "عدد القطع",
  continueShoppingLabel = "متابعة التسوق",
  shippingFee,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  className,
}: CartDrawerProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={className}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {itemsCountLabel}: {totalItems.toLocaleString("ar-EG")}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <span className="text-title-2">🛒</span>
            </div>
            <h3 className="text-body font-bold text-[var(--neutral-800)] mb-1">
              {emptyTitle}
            </h3>
            <p className="text-caption text-[var(--neutral-500)] mb-6">
              {emptyDescription}
            </p>
            <Button variant="default" onClick={() => onOpenChange(false)}>
              {continueShoppingLabel}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.sizeLabel}`}>
                <div className="flex gap-3 py-4">
                  {/* Image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage
                      slug={item.slug}
                      src={item.image}
                      name={item.name}
                      tier="card"
                      frame="thumb"
                      sizes="64px"
                      className="p-1"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-caption font-medium text-[var(--neutral-800)] line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-caption text-[var(--neutral-500)]">
                      {item.sizeLabel}
                    </p>

                    {/* The stepper and the price share a narrow column. When
                        they no longer fit side by side the price drops to its
                        own line (end-aligned) instead of overflowing under
                        the stepper — Arabic-Indic prices are wide. */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      {/* Quantity controls — 24px visuals, ~44px hit areas
                          (::after), spaced so the extended areas never
                          overlap each other. */}
                      <div className="flex shrink-0 items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="relative after:absolute after:-inset-2.5 after:content-['']"
                          onClick={() =>
                            onUpdateQuantity?.(
                              item.productId,
                              item.sizeLabel,
                              item.quantity - 1,
                            )
                          }
                          aria-label={`- ${quantityLabel}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-caption font-bold text-[var(--neutral-800)] min-w-[1.5rem] text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="relative after:absolute after:-inset-2.5 after:content-['']"
                          onClick={() =>
                            onUpdateQuantity?.(
                              item.productId,
                              item.sizeLabel,
                              item.quantity + 1,
                            )
                          }
                          aria-label={`+ ${quantityLabel}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price — never breaks between the digits and the
                          currency, and stays aligned to the row end when it
                          wraps onto its own line. */}
                      <span className="ms-auto shrink-0 whitespace-nowrap text-caption font-bold tabular-nums text-[var(--neutral-800)]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      onRemoveItem?.(item.productId, item.sizeLabel)
                    }
                    className="relative self-start text-[var(--neutral-400)] hover:text-[var(--color-error)] after:absolute after:-inset-2.5 after:content-['']"
                    aria-label={removeLabel}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <div className="space-y-2 w-full mb-2">
              <div className="flex items-center justify-between text-caption">
                <span className="text-[var(--neutral-600)]">
                  {totalLabel}
                </span>
                <span className="text-[var(--neutral-800)]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              {shippingFee !== undefined && (
                <div className="flex items-center justify-between text-caption">
                  <span className="flex items-center gap-1.5 text-[var(--neutral-600)]">
                    <Truck className="h-3.5 w-3.5" />
                    مصاريف الشحن
                  </span>
                  <span className="text-[var(--neutral-800)]">
                    {formatPrice(shippingFee)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-body font-bold text-[var(--neutral-800)]">الإجمالي</span>
                <span className="text-headline font-bold text-[var(--color-accent)]">
                  {formatPrice(totalPrice + (shippingFee ?? 0))}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
            >
              {checkoutLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
