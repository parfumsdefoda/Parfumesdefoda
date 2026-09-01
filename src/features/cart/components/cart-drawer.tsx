"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
import { SHIPPING_FEE } from "@/config/constants";

export interface CartItemData {
  productId: string;
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
 * Uses Shadcn Sheet (right side) + Framer Motion for item animations.
 * Pure presentational — all data and callbacks via props.
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
            {totalItems} {quantityLabel}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <span className="text-3xl">🛒</span>
            </div>
            <h3 className="text-base font-semibold text-[var(--neutral-800)] mb-1">
              {emptyTitle}
            </h3>
            <p className="text-sm text-[var(--neutral-500)]">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.sizeLabel}`}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex gap-3 py-4">
                    {/* Image */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-secondary)]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[var(--neutral-800)] line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[var(--neutral-500)]">
                        {item.sizeLabel}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon-xs"
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
                          <span className="text-xs font-semibold text-[var(--neutral-800)] min-w-[1.5rem] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon-xs"
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

                        {/* Price */}
                        <span className="text-sm font-bold text-[var(--neutral-800)]">
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
                      className="self-start text-[var(--neutral-400)] hover:text-[var(--color-error)]"
                      aria-label={removeLabel}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Separator />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <div className="space-y-2 w-full mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--neutral-600)]">
                  {totalLabel}
                </span>
                <span className="text-[var(--neutral-800)]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--neutral-600)]">
                  <Truck className="h-3.5 w-3.5" />
                  مصاريف الشحن
                </span>
                <span className="text-[var(--neutral-800)]">
                  {formatPrice(SHIPPING_FEE)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[var(--neutral-800)]">الإجمالي</span>
                <span className="text-lg font-bold text-[var(--color-accent)]">
                  {formatPrice(totalPrice + SHIPPING_FEE)}
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
