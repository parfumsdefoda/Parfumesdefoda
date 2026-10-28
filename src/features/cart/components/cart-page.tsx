"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartLine, CartTotals, type CartLineLabels } from "./cart-line";
import { useCart } from "@/providers/CartProvider";
import { resolveCartLines, getCartTotals, isCartCheckoutBlocked, type CartCatalogProduct } from "@/lib/cart-utils";
import { formatNumber } from "@/lib/currency";
import { getShippingFee } from "@/lib/shipping";
import type { FullSettings } from "@/types/services";

const lineLabels: CartLineLabels = {
  quantity: "الكمية",
  remove: "إزالة المنتج",
  issues: {
    "product-unavailable": "هذا المنتج لم يعد متاحًا. احذفه للمتابعة.",
    "size-unavailable": "هذا الحجم لم يعد متاحًا. احذفه أو ارجع للمنتج.",
    "price-changed": "تغير السعر منذ إضافة المنتج. احذف السطر وأضفه بالسعر الحالي.",
    "invalid-quantity": "الكمية غير صالحة. عدّلها لتكون من ١ إلى ٢٠.",
  },
};

export function CartPageClient({
  catalogue,
  shipping,
}: {
  catalogue: CartCatalogProduct[];
  shipping: FullSettings["shipping"];
}) {
  const cart = useCart();
  const lines = useMemo(() => resolveCartLines(cart.items, catalogue), [cart.items, catalogue]);
  const totals = getCartTotals(lines, getShippingFee({ shipping }));
  const blocked = isCartCheckoutBlocked(lines);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-[var(--space-section)]">
      <h1 className="mb-8 text-title-2 font-bold text-[var(--color-text)]">سلة التسوق</h1>
      {lines.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag aria-hidden="true" className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <h2 className="text-title-3 font-bold">سلة التسوق فارغة</h2>
          <p className="mt-2 text-body text-[var(--color-text-muted)]">أضف منتجات إلى السلة للمتابعة.</p>
          <Button render={<Link href="/shop" />} className="mt-6">تصفّح المتجر</Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          <div className="divide-y divide-[var(--color-border)] rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
            <p aria-live="polite" className="py-3 text-caption text-[var(--color-text-muted)]">
              {formatNumber(cart.totalItems)} قطعة في السلة
            </p>
            {lines.map((line) => (
              <CartLine
                key={`${line.item.productId}-${line.item.sizeLabel}`}
                line={line}
                labels={lineLabels}
                onUpdateQuantity={(quantity) => cart.updateQuantity(line.item.productId, line.item.sizeLabel, quantity)}
                onRemove={() => cart.removeItem(line.item.productId, line.item.sizeLabel)}
              />
            ))}
            <div className="py-4 text-end">
              <Button render={<Link href="/shop" />} variant="tertiary">متابعة التسوق</Button>
            </div>
          </div>
          <aside className="h-fit rounded-card border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 lg:sticky lg:top-24">
            <h2 className="mb-5 text-headline font-bold">ملخص الطلب</h2>
            <CartTotals subtotal={totals.subtotal} shipping={totals.shipping} labels={{ subtotal: "المجموع الفرعي", shipping: "مصاريف الشحن", total: "الإجمالي" }} />
            {blocked && (
              <p role="alert" className="mt-4 rounded-control border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-caption text-[var(--color-danger)]">
                احذف أو صحح الأسطر غير الصالحة قبل إتمام الطلب.
              </p>
            )}
            <Button render={<Link href="/checkout" />} disabled={blocked} className="mt-5 w-full" size="lg">
              إتمام الطلب
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}
