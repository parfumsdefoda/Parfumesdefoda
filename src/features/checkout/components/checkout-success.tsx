"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice, formatSizeLabel } from "@/lib/currency";
import { useOrderSummary } from "@/features/checkout/order-summary-store";

export interface CheckoutSuccessProps {
  /** Store WhatsApp number comes from data/contact.json. */
  whatsappNumber?: string;
}

export function CheckoutSuccess({ whatsappNumber = "" }: CheckoutSuccessProps) {
  const summary = useOrderSummary();
  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is optional; the order number remains selectable.
    }
  };

  const dialNumber = whatsappNumber.replace(/\D/g, "");
  const whatsappHref = dialNumber && summary
    ? `https://wa.me/${dialNumber}?text=${encodeURIComponent(`طلب رقم ${summary.orderNumber} — Parfums De Foda`)}`
    : null;

  return (
    <section className="container mx-auto px-4 py-[var(--space-section)]">
      <div className="reveal mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success)]/10">
          <CheckCircle className="h-10 w-10 text-[var(--color-success)]" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-title-3 font-bold text-[var(--neutral-800)]">
          {summary ? `شكراً لك يا ${summary.customerFirstName}` : "شكراً لزيارتك، لم نعثر على تفاصيل الطلب في هذه الجلسة."}
        </h1>
        <p className="mb-6 text-[var(--neutral-500)]">
          {summary
            ? "تم استلام طلبك، وسنتواصل معك عبر واتساب لتأكيده."
            : "يسعدنا وجودك معنا. يمكنك متابعة التسوق من المتجر."}
        </p>

        {summary && (
          <>
            <div className="mb-6 rounded-card border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="mb-2 text-caption text-[var(--color-text-muted)]">رقم الطلب</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-headline font-bold tracking-wider text-[var(--color-brand)]" dir="ltr">
                  {summary.orderNumber}
                </span>
                <Button type="button" variant="ghost" size="icon-xs" onClick={handleCopyOrderNumber} aria-label="نسخ رقم الطلب">
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              </div>
              {copied && <p className="mt-1 text-caption text-[var(--color-success)]" role="status">تم النسخ</p>}
            </div>

            <section className="mb-6 rounded-card border border-[var(--color-border)] p-4 text-start" aria-labelledby="success-summary-title">
              <h2 id="success-summary-title" className="mb-3 text-headline font-bold">ملخص طلبك</h2>
              <ul className="divide-y divide-[var(--color-border)]">
                {summary.lines.map((line, index) => (
                  <li key={`${line.name}-${line.sizeLabel}-${index}`} className="flex items-start justify-between gap-4 py-3 text-caption">
                    <span className="min-w-0">{line.name} — {formatSizeLabel(line.sizeLabel)} × {formatNumber(line.quantity)}</span>
                    <span className="shrink-0 whitespace-nowrap">{formatPrice(line.unitPrice * line.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 font-bold">
                <span>الإجمالي شامل الشحن</span>
                <span className="whitespace-nowrap text-[var(--color-brand)]">{formatPrice(summary.total)}</span>
              </div>
            </section>

            <section className="mb-6 rounded-card bg-[var(--color-surface-muted)] p-4 text-start" aria-labelledby="next-steps-title">
              <h2 id="next-steps-title" className="mb-3 text-headline font-bold">الخطوات التالية</h2>
              <ol className="space-y-2 text-caption text-[var(--color-text-muted)]">
                <li>١. نتواصل معك عبر واتساب لتأكيد الطلب.</li>
                <li>٢. نجهز الطلب ونرسله إليك.</li>
                <li>٣. تدفع عند استلام الطلب.</li>
              </ol>
            </section>
          </>
        )}

        <div className="flex flex-col gap-3">
          {whatsappHref && (
            <Button render={<a href={whatsappHref} target="_blank" rel="noopener noreferrer" />} variant="secondary" className="w-full">
              <MessageCircle aria-hidden="true" className="size-4" />
              أرسل رقم الطلب عبر واتساب
            </Button>
          )}
          <Button render={<Link href="/shop" />}>
            <ArrowRight aria-hidden="true" className="size-4" />
            متابعة التسوق
          </Button>
        </div>
      </div>
    </section>
  );
}
