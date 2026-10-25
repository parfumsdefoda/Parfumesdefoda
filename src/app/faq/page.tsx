import type { Metadata } from "next";
import Link from "next/link";
import { loadContent } from "@/services/content";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";
import { FaqAccordion } from "@/features/faq";

/**
 * /faq — the questions already in content/faq.json, on their own page.
 *
 * Nothing new is written here: the page exists so the header, the footer and
 * the homepage can link to one stable URL instead of an anchor.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await loadLocale();
  const title = t(locale, "faq.title", "الأسئلة الشائعة");
  return {
    title,
    description: t(
      locale,
      "faq.description",
      "أسئلة المتكررة عن الدفع والتوصيل والإرجاع.",
    ),
    alternates: { canonical: "/faq" },
  };
}

export default async function FaqPage() {
  const [content, locale] = await Promise.all([loadContent(), loadLocale()]);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-[var(--space-section)] pt-8">
      <h1 className="mb-2 text-title-3 font-bold text-[var(--color-text)]">
        {t(locale, "faq.title", "الأسئلة الشائعة")}
      </h1>
      <p className="mb-8 text-caption text-[var(--color-text-muted)]">
        {t(locale, "faq.lead", "كل ما تحتاج معرفته قبل الطلب.")}
      </p>

      <FaqAccordion
        items={content.faq}
        title={t(locale, "faq.title", "الأسئلة الشائعة")}
      />

      <p className="mt-8 text-caption text-[var(--color-text-muted)]">
        <Link
          href="/contact"
          className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          {t(locale, "footer.contact", "اتصل بنا")}
        </Link>
      </p>
    </div>
  );
}
