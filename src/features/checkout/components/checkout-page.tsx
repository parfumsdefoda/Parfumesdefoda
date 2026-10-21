"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/features/layout";
import { CheckoutForm } from "@/features/checkout";
import { useCart } from "@/providers/CartProvider";
import { formatPrice } from "@/lib/currency";
import { getShippingFee } from "@/lib/shipping";
import type { FullSettings } from "@/types/services";
import type { CheckoutFormData } from "@/schemas/checkout";

export interface CheckoutPageClientProps {
  /** Shipping config from data/settings.json (flat fee, no free threshold) */
  shipping: FullSettings["shipping"];
}

/** Error thrown when the API rejects the order but explains why. */
class OrderSubmitError extends Error {}

/** Payment is cash on delivery — there is no online payment gateway. */
const PAYMENT_METHOD = "الدفع عند الاستلام";

const GENERIC_SUBMIT_ERROR =
  "حصلت مشكلة أثناء إرسال الطلب. اتأكد من اتصالك بالإنترنت وجرب تاني، أو تواصل معانا واتساب.";

/**
 * CheckoutPageClient — full checkout page with two-column RTL layout.
 * Right column: checkout form.
 * Left column: order summary with payment method.
 */
export function CheckoutPageClient({
  shipping,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const cart = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const subtotal = cart.totalPrice;
  const shippingCost = getShippingFee({ shipping });
  const total = subtotal + shippingCost;

  const handleSubmit = async (data: CheckoutFormData) => {
    if (cart.items.length === 0) return;

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
      <PageLayout>
        <div id="main-content" className="container mx-auto px-4 py-[var(--space-section)] text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
            <ShoppingBag className="h-10 w-10 text-[var(--neutral-300)]" />
          </div>
          <h1 className="text-title-3 font-bold text-[var(--neutral-800)] mb-2">
            سلة التسوق فارغة
          </h1>
          <p className="text-[var(--neutral-500)] mb-8">
            أضف منتجات إلى السلة أولاً لمتابعة الشراء
          </p>
          <Button render={<Link href="/" />}>
            <ArrowRight className="h-4 w-4 ms-1.5" />
            العودة للمتجر
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section id="main-content" className="container mx-auto px-4 py-[var(--space-section)]">
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
              submitLabel={`تأكيد الطلب — ${formatPrice(total)}`}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* ─── Left Column: Order Summary ─── */}
          <div className="order-2 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="sticky top-24 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
            >
              <h2 className="text-headline font-bold text-[var(--neutral-800)] mb-4">
                ملخص الطلب ({cart.totalItems} منتج)
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-4">
                {cart.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.sizeLabel}`}
                    className="flex gap-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-primary)]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-caption font-medium text-[var(--neutral-800)] line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-caption text-[var(--neutral-500)]">
                        {item.sizeLabel}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() =>
                              cart.updateQuantity(
                                item.productId,
                                item.sizeLabel,
                                item.quantity - 1,
                              )
                            }
                            aria-label="نقص الكمية"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-caption font-bold text-[var(--neutral-800)] min-w-[1.5rem] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() =>
                              cart.updateQuantity(
                                item.productId,
                                item.sizeLabel,
                                item.quantity + 1,
                              )
                            }
                            aria-label="زيادة الكمية"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-caption font-bold text-[var(--neutral-800)]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        cart.removeItem(item.productId, item.sizeLabel)
                      }
                      className="self-start text-[var(--neutral-400)] hover:text-[var(--color-error)]"
                      aria-label="إزالة المنتج"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-[var(--neutral-500)]">المجموع الفرعي</span>
                  <span className="text-[var(--neutral-700)]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-[var(--neutral-500)]">مصاريف الشحن</span>
                  <span className="text-[var(--neutral-700)]">
                    {formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-[var(--neutral-500)]">طريقة الدفع</span>
                  <span className="text-[var(--neutral-700)]">
                    {PAYMENT_METHOD}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-body font-bold text-[var(--neutral-800)]">الإجمالي</span>
                  <span className="text-title-3 font-bold text-[var(--color-accent)]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
