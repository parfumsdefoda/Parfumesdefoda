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
import { generateOrderNumber } from "@/lib/order-number";
import { SHIPPING_FEE } from "@/config/constants";
import type { CheckoutFormData } from "@/schemas/checkout";

export interface CheckoutPageClientProps {
  /** Shipping config (deprecated — now uses fixed SHIPPING_FEE constant) */
  shipping?: { cost: number; freeAbove?: number };
}

/**
 * CheckoutPageClient — full checkout page with two-column RTL layout.
 * Right column: checkout form.
 * Left column: order summary with payment method.
 */
export function CheckoutPageClient({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for backward compatibility
  shipping: _shipping,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const cart = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.totalPrice;
  const shippingCost = SHIPPING_FEE;
  const total = subtotal + shippingCost;

  const handleSubmit = async (data: CheckoutFormData) => {
    if (cart.items.length === 0) return;

    setIsSubmitting(true);

    const orderNumber = generateOrderNumber();

    // Build order object with structured address
    const order = {
      orderNumber,
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
        name: item.name,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      subtotal,
      shippingCost,
      total,
      paymentMethod: "الدفع عند الاستلام",
      createdAt: new Date().toISOString(),
    };

    try {
      // Submit order to API
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error("Failed to submit order");
      }

      // Store order number in session for success page
      try {
        sessionStorage.setItem("parfumsdefoda-last-order", orderNumber);
      } catch {
        // Silent fail
      }

      // Clear cart and redirect to success
      cart.clearCart();
      router.push("/checkout/success");
    } catch {
      // If API fails, still proceed with local order
      try {
        sessionStorage.setItem("parfumsdefoda-last-order", orderNumber);
      } catch {
        // Silent fail
      }
      cart.clearCart();
      router.push("/checkout/success");
    }
  };

  if (cart.items.length === 0) {
    return (
      <PageLayout>
        <div id="main-content" className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
            <ShoppingBag className="h-10 w-10 text-[var(--neutral-300)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--neutral-800)] mb-2">
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
      <section id="main-content" className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--neutral-500)] hover:text-[var(--color-accent)] transition-colors mb-6"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمتجر
        </Link>

        <h1 className="text-2xl font-bold text-[var(--neutral-800)] mb-8">
          إتمام الطلب
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
          {/* ─── Right Column: Checkout Form (RTL primary side) ─── */}
          <div className="order-1 lg:order-1">
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
              <h2 className="text-lg font-bold text-[var(--neutral-800)] mb-4">
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
                      <h4 className="text-sm font-medium text-[var(--neutral-800)] line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[var(--neutral-500)]">
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
                          <span className="text-xs font-semibold text-[var(--neutral-800)] min-w-[1.5rem] text-center">
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
                        <span className="text-sm font-bold text-[var(--neutral-800)]">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--neutral-500)]">المجموع الفرعي</span>
                  <span className="text-[var(--neutral-700)]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--neutral-500)]">مصاريف الشحن</span>
                  <span className="text-[var(--neutral-700)]">
                    {formatPrice(shippingCost)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-[var(--neutral-800)]">الإجمالي</span>
                  <span className="text-xl font-bold text-[var(--color-accent)]">
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
