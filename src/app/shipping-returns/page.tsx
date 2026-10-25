import type { Metadata } from "next";
import Link from "next/link";
import { loadContent } from "@/services/content";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";
import { formatPrice } from "@/lib/currency";
import { getShippingFee } from "@/lib/shipping";
import { PoliciesAccordion } from "@/features/policies";

/**
 * /shipping-returns — the shipping, returns and payment policies that already
 * live in content/policies.json, plus the flat fee from data/settings.json.
 *
 * No new policy text is written on this page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await loadLocale();
  const title = t(locale, "footer.shippingReturns", "الشحن والإرجاع");
  return {
    title,
    description: t(
      locale,
      "shipping.description",
      "مواعيد التوصيل، سياسة الإرجاع وطريقة الدفع.",
    ),
    alternates: { canonical: "/shipping-returns" },
  };
}

export default async function ShippingReturnsPage() {
  const [content, settings, locale] = await Promise.all([
    loadContent(),
    loadFullSettings(),
    loadLocale(),
  ]);

  const shippingFee = getShippingFee(settings);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-[var(--space-section)] pt-8">
      <h1 className="mb-2 text-title-3 font-bold text-[var(--color-text)]">
        {t(locale, "footer.shippingReturns", "الشحن والإرجاع")}
      </h1>
      <p className="mb-6 text-caption text-[var(--color-text-muted)]">
        {t(locale, "footer.note", "الدفع عند الاستلام · شحن ثابت {fee} لكل الطلبات").replace(
          "{fee}",
          formatPrice(shippingFee),
        )}
      </p>

      <PoliciesAccordion
        sections={content.policies}
        title={t(locale, "policies.title", "السياسات")}
      />

      <p className="mt-8 text-caption text-[var(--color-text-muted)]">
        <Link
          href="/faq"
          className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          {t(locale, "footer.faq", "الأسئلة الشائعة")}
        </Link>
      </p>
    </div>
  );
}
