"use client";

import Link from "next/link";
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
import { formatNumber } from "@/lib/currency";
import { CartLine, CartTotals, type CartLineLabels } from "./cart-line";
import type { ResolvedCartLine } from "@/lib/cart-utils";

export interface CartDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called to close the drawer */
  onOpenChange: (open: boolean) => void;
  /** Cart items resolved against the current visible catalogue. */
  items: ResolvedCartLine[];
  lineLabels?: CartLineLabels;
  viewCartLabel?: string;
  emptyHref?: string;
  resolveIssuesLabel?: string;
  totalsLabels?: { subtotal: string; shipping: string; total: string };
  /** Label for the sheet title */
  title?: string;
  /** Label when cart is empty */
  emptyTitle?: string;
  /** Description when cart is empty */
  emptyDescription?: string;
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
  checkoutDisabled?: boolean;
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
  lineLabels,
  viewCartLabel = "عرض السلة",
  emptyHref = "/shop",
  resolveIssuesLabel = "احذف أو صحح الأسطر غير الصالحة قبل إتمام الطلب.",
  totalsLabels = { subtotal: "المجموع الفرعي", shipping: "مصاريف الشحن", total: "الإجمالي" },
  title = "سلة التسوق",
  emptyTitle = "سلة التسوق فارغة",
  emptyDescription = "أضف منتجات إلى السلة للمتابعة",
  checkoutLabel = "إتمام الطلب",
  removeLabel = "إزالة",
  quantityLabel = "الكمية",
  itemsCountLabel = "عدد القطع",
  continueShoppingLabel = "متابعة التسوق",
  shippingFee,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  checkoutDisabled = false,
  className,
}: CartDrawerProps) {
  const resolvedLineLabels = lineLabels ?? {
    quantity: quantityLabel,
    remove: removeLabel,
    issues: {
      "product-unavailable": "هذا المنتج لم يعد متاحًا. احذفه للمتابعة.",
      "size-unavailable": "هذا الحجم لم يعد متاحًا. احذفه أو ارجع للمنتج.",
      "price-changed": "تغير السعر منذ إضافة المنتج. احذف السطر وأضفه بالسعر الحالي.",
      "invalid-quantity": "الكمية غير صالحة. عدّلها لتكون من ١ إلى ٢٠.",
    },
  };
  const totalItems = items.reduce((sum, line) => sum + line.item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, line) => sum + (line.size?.price ?? line.item.price) * line.item.quantity,
    0,
  );
  const hasIssues = items.some((line) => line.issue !== null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={className}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {itemsCountLabel}: {formatNumber(totalItems)}
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
            <Button render={<Link href={emptyHref} />} variant="primary">
              {continueShoppingLabel}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            {items.map((line) => (
              <div key={`${line.item.productId}-${line.item.sizeLabel}`}>
                <CartLine
                  line={line}
                  labels={resolvedLineLabels}
                  onUpdateQuantity={(quantity) => onUpdateQuantity?.(line.item.productId, line.item.sizeLabel, quantity)}
                  onRemove={() => onRemoveItem?.(line.item.productId, line.item.sizeLabel)}
                />
                <Separator />
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <div className="mb-2 w-full">
              <CartTotals
                subtotal={totalPrice}
                shipping={shippingFee ?? 0}
                labels={totalsLabels}
              />
            </div>
            {hasIssues && (
              <p role="alert" className="mb-2 text-caption text-[var(--color-danger)]">
                {resolveIssuesLabel}
              </p>
            )}
            <Button className="w-full" size="lg" onClick={onCheckout} disabled={checkoutDisabled || hasIssues}>
              {checkoutLabel}
            </Button>
            <Button render={<Link href="/cart" />} variant="tertiary" className="mx-auto mt-2">
              {viewCartLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
