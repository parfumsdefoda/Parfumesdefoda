"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function getOrderNumber(): string | null {
  try {
    return sessionStorage.getItem("parfumsdefoda-last-order");
  } catch {
    return null;
  }
}

export interface CheckoutSuccessProps {
  /**
   * Store WhatsApp number (digits only preferred). Comes from
   * NEXT_PUBLIC_WHATSAPP_NUMBER or data/contact.json — never hardcoded here.
   */
  whatsappNumber?: string;
}

/**
 * Checkout success screen — displayed after order submission.
 * Shows the server order number and lets the customer confirm on WhatsApp.
 */
export function CheckoutSuccess({ whatsappNumber = "" }: CheckoutSuccessProps) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load order number after hydration to avoid SSR/client mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating from external store on mount
    setOrderNumber(getOrderNumber());
  }, []);

  const handleCopyOrderNumber = async () => {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const dialNumber = whatsappNumber.replace(/\D/g, "");
  const whatsappHref =
    dialNumber && orderNumber
      ? `https://wa.me/${dialNumber}?text=${encodeURIComponent(
          `طلب رقم ${orderNumber} — Parfums De Foda`,
        )}`
      : null;

  return (
      <section className="container mx-auto px-4 py-[var(--space-section)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto max-w-md text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success)]/10"
          >
            <CheckCircle className="h-10 w-10 text-[var(--color-success)]" />
          </motion.div>

          {/* Title */}
          <h1 className="text-title-3 font-bold text-[var(--neutral-800)] mb-2">
            تم استلام طلبكم بنجاح
          </h1>

          <p className="text-[var(--neutral-500)] mb-6">
            وسيتم التواصل معكم على واتساب لتأكيد الطلب
          </p>

          {/* Order number */}
          {orderNumber && (
            <div className="mb-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
              <p className="text-caption text-[var(--neutral-400)] mb-2">رقم الطلب</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-headline font-bold text-[var(--color-accent)] tracking-wider" dir="ltr">
                  {orderNumber}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyOrderNumber}
                  aria-label="نسخ رقم الطلب"
                  className="text-[var(--neutral-400)] hover:text-[var(--color-accent)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              {copied && (
                <p className="text-caption text-[var(--color-success)] mt-1">تم النسخ!</p>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mb-8 rounded-xl bg-[var(--bg-secondary)] p-4 text-right">
            <p className="text-caption text-[var(--neutral-600)]">
              <strong className="text-[var(--neutral-800)]">ملاحظة:</strong>{" "}
              يمكنك مشاركة رقم الطلب معنا عبر واتساب لتسريع عملية التوصيل.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {whatsappHref && (
              <Button
                render={
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                nativeButton={false}
                variant="secondary"
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 ms-1.5" />
                تواصل معنا على واتساب
              </Button>
            )}
            <Button render={<Link href="/" />} variant="outline">
              <ArrowRight className="h-4 w-4 ms-1.5" />
              العودة للمتجر
            </Button>
          </div>
        </motion.div>
      </section>
  );
}
