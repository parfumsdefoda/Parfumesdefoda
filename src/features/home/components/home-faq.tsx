import Link from "next/link";
import { FaqAccordion, type FaqItem } from "@/features/faq";

export interface HomeFaqProps {
  title: string;
  items: FaqItem[];
  /** "كل الأسئلة" — the full list lives on /faq. */
  allLabel: string;
}

/**
 * HomeFaq — five questions on the homepage, the rest on /faq.
 *
 * The accordion is the existing accessible component (it owns its own section
 * heading), so this wrapper only caps the list and offers the way to the full
 * page, built from the same content/faq.json strings.
 */
export function HomeFaq({ title, items, allLabel }: HomeFaqProps) {
  if (items.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-[var(--space-section)]">
      <FaqAccordion items={items.slice(0, 5)} title={title} />
      <Link
        href="/faq"
        className="mt-4 inline-block text-caption font-bold text-[var(--color-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        {allLabel}
      </Link>
    </div>
  );
}
