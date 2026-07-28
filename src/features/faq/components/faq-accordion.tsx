"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  /** FAQ items */
  items: FaqItem[];
  /** Section heading */
  title?: string;
  /** Accordion allowMultiple open */
  multiple?: boolean;
  className?: string;
}

/**
 * FaqAccordion — displays FAQ items in an accessible accordion.
 * Pure presentational — data via props.
 */
export function FaqAccordion({
  items,
  title = "الأسئلة الشائعة",
  multiple = true,
  className,
}: FaqAccordionProps) {
  if (items.length === 0) return null;

  return (
    <section className={className ?? ""} aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="text-xl font-bold text-[var(--neutral-800)] mb-4"
      >
        {title}
      </h2>
      <Accordion multiple={multiple}>
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-[var(--neutral-600)] leading-relaxed">
                {item.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
