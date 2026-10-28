"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartLine, CartTotals, type CartLineLabels } from "@/features/cart/components/cart-line";
import { resolveCartLines, getCartTotals, isCartCheckoutBlocked, type CartCatalogProduct } from "@/lib/cart-utils";
import { CheckoutForm } from "@/features/checkout";
import { useCart } from "@/providers/CartProvider";
import { formatNumber, formatPrice } from "@/lib/currency";
import { getShippingFee } from "@/lib/shipping";
import type { FullSettings } from "@/types/services";
import type { CheckoutFormData } from "@/schemas/checkout";

export interface CheckoutPageClientProps {
  /** Shipping config from data/settings.json (flat fee, no free threshold) */
  shipping: FullSettings["shipping"];
  catalogue: CartCatalogProduct[];
}

/** Error thrown when the API rejects the order but explains why. */
class OrderSubmitError extends Error {}

/** Payment is cash on delivery — there is no online payment gateway. */
const PAYMENT_METHOD = "الدفع عند الاستلام";

const GENERIC_SUBMIT_ERROR =
  "حصلت مشكلة أثناء إرسال الطلب. اتأكد من اتصالك بالإنترنت وجرب تاني، أو تواصل معانا واتساب.";

const CHECKOUT_LINE_LABELS: CartLineLabels = {
  quantity: "الكمية",
  remove: "إزالة المنتج",
  issues: {
    "product-unavailable": "هذا المنتج لم يعد متاحًا. احذفه للمتابعة.",
    "size-unavailable": "هذا الحجم لم يعد متاحًا. احذفه أو ارجع للمنتج.",
    "price-changed": "تغير السعر منذ إضافة المنتج. احذف السطر وأضفه بالسعر الحالي.",
    "invalid-quantity": "الكمية غير صالحة. عدّلها لتكون من ١ إلى ٢٠.",
  },
};

/**
 * CheckoutPageClient — full checkout page with two-column RTL layout.
 * Right column: checkout form.
 * Left column: order summary with payment method.
 */
export function CheckoutPageClient({
  shipping,
  catalogue,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const cart = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lines = useMemo(() => resolveCartLines(cart.items, catalogue), [cart.items, catalogue]);
  const totals = getCartTotals(lines, getShippingFee({ shipping }));
  const subtotal = totals.subtotal;
  const shippingCost = totals.shipping;
  const total = totals.total;
  const cartBlocked = isCartCheckoutBlocked(lines);

  const handleSubmit = async (data: CheckoutFormData) => {
    if (cart.items.length === 0 || cartBlocked) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Only the identity of each line is sent — the server prices the order
      // from the catalog and mints the order number itself.
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: data.name,
            phone: data.phone,
            whatsapp: data.whatsapp,
            governorate: data.governorate,
            city: data.city,
            addressDetails: data.addressDetails,
          },
          items: cart.items.map((item) => ({
            productId: item.productId,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
          })),
          paymentMethod: PAYMENT_METHOD,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as
        | { orderNumber?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new OrderSubmitError(payload?.error ?? GENERIC_SUBMIT_ERROR);
      }

      const orderNumber = payload?.orderNumber;
      if (!orderNumber) {
        throw new Error("Missing order number in response");
      }

      // Store the SERVER order number for the success page
      try {
        sessionStorage.setItem("parfumsdefoda-last-order", orderNumber);
      } catch {
        // Silent fail
      }

      // Clear cart and redirect to success — ONLY on confirmed success
      cart.clearCart();
      router.push("/checkout/success");
    } catch (error) {
      // API failed — do NOT navigate to the success page.
      // Keep the cart intact so the customer can retry without losing anything.
      setIsSubmitting(false);
      setSubmitError(
        error instanceof OrderSubmitError ? error.message : GENERIC_SUBMIT_ERROR,
      );
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-[var(--space-section)] text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
            <ShoppingBag className="h-10 w-10 text-[var(--neutral-300)]" />
          </div>
          <h1 className="text-title-3 font-bold text-[var(--neutral-800)] mb-2">
            سلة التسوق فارغة
          </h1>
          <p className="text-[var(--neutral-500)] mb-8">
            أضف منتجات إلى السلة أولاً لمتابعة الشراء
          </p>
          <Button render={<Link href="/shop" />}>
            <ArrowRight className="h-4 w-4 ms-1.5" />
            العودة للمتجر
          </Button>
        </div>
    );
  }

  return (
      <section className="container mx-auto px-4 py-[var(--space-section)]">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-caption text-[var(--neutral-500)] hover:text-[var(--color-accent)] transition-colors mb-6"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمتجر
        </Link>

        <h1 className="text-title-3 font-bold text-[var(--neutral-800)] mb-8">
          إتمام الطلب
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
          {/* ─── Right Column: Checkout Form (RTL primary side) ─── */}
          <div className="order-1 lg:order-1">
            {submitError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-caption text-[var(--color-error)]"
              >
                <span aria-hidden="true">⚠️</span>
                <p className="">{submitError}</p>
              </div>
            )}
            {cartBlocked && (
              <p role="alert" className="mb-4 rounded-control border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-caption text-[var(--color-danger)]">
                احذف أو صحح الأسطر غير الصالحة قبل إتمام الطلب.
              </p>
            )}
            <CheckoutForm
              title="بيانات التوصيل"
              nameLabel="الاسم بالكامل"
              namePlaceholder="أدخل اسمك الكامل"
              phoneLabel="رقم الموبايل"
              phonePlaceholder="01XXXXXXXXX"
              whatsappLabel="رقم واتساب للتواصل"
              whatsappPlaceholder="01XXXXXXXXX"
              governorateLabel="المحافظة"
              cityLabel="المدينة"
              addressDetailsLabel="العنوان بالتفصيل — أقرب معلم"
              addressDetailsPlaceholder="الشارع، رقم المبنى، العلامة القريبة"
              submitLabel={
                <>
                  تأكيد الطلب —{" "}
                  <span className="whitespace-nowrap tabular-nums">
                    {formatPrice(total)}
                  </span>
                </>
              }
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              disabled={cartBlocked}
            />
          </div>

          {/* ─── Left Column: Order Summary ─── */}
          <div className="order-2 lg:order-2">
            <div className="reveal sticky top-24 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
              <h2 className="text-headline font-bold text-[var(--neutral-800)] mb-4">
                ملخص الطلب ({formatNumber(cart.totalItems)} منتج)
              </h2>

              {/* Items */}
              <div className="mb-4 divide-y divide-[var(--color-border)]">
                {lines.map((line) => (
                  <CartLine
                    key={`${line.item.productId}-${line.item.sizeLabel}`}
                    line={line}
                    labels={CHECKOUT_LINE_LABELS}
                    onUpdateQuantity={(quantity) => cart.updateQuantity(line.item.productId, line.item.sizeLabel, quantity)}
                    onRemove={() => cart.removeItem(line.item.productId, line.item.sizeLabel)}
                  />
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <CartTotals subtotal={subtotal} shipping={shippingCost} labels={{ subtotal: "المجموع الفرعي", shipping: "مصاريف الشحن", total: "الإجمالي" }} />
              <div className="mt-3 flex items-center justify-between text-caption">
                <span className="text-[var(--neutral-500)]">طريقة الدفع</span>
                <span className="text-[var(--neutral-700)]">{PAYMENT_METHOD}</span>
              </div>
              {cartBlocked && (
                <p role="alert" className="mt-4 rounded-control border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-caption text-[var(--color-danger)]">
                  احذف أو صحح الأسطر غير الصالحة قبل إتمام الطلب.
                </p>
              )}

            </div>
          </div>
        </div>
      </section>
  );
}
