"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export interface PolicySection {
  key: string;
  title: string;
  body: string;
}

export interface PoliciesAccordionProps {
  /** Policy sections */
  sections: PolicySection[];
  /** Section heading */
  title?: string;
  /** Accordion allowMultiple open */
  multiple?: boolean;
  className?: string;
}

/**
 * PoliciesAccordion — displays store policies in an accessible accordion.
 * Pure presentational — data via props.
 */
export function PoliciesAccordion({
  sections,
  title = "السياسات",
  multiple = true,
  className,
}: PoliciesAccordionProps) {
  if (sections.length === 0) return null;

  return (
    <section className={className ?? ""} aria-labelledby="policies-heading">
      <h2
        id="policies-heading"
        className="text-xl font-bold text-[var(--neutral-800)] mb-4"
      >
        {title}
      </h2>
      <Accordion multiple={multiple}>
        {sections.map((section) => (
          <AccordionItem key={section.key} value={`policy-${section.key}`}>
            <AccordionTrigger>{section.title}</AccordionTrigger>
            <AccordionContent>
              <p className="text-[var(--neutral-600)] leading-relaxed">
                {section.body}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
