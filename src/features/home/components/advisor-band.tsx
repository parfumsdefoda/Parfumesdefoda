import { AdvisorLink } from "./advisor-link";

export interface AdvisorBandProps {
  title: string;
  body: string;
  cta: string;
}

/**
 * AdvisorBand — the one invitation to the perfume advisor, mid-page.
 *
 * A hairline strip on paper rather than the old dark block: the page no longer
 * changes mode to sell the advisor, it offers a purple rectangular button and
 * lets the type do the rest. Nothing here claims more than the panel does.
 */
export function AdvisorBand({ title, body, cta }: AdvisorBandProps) {
  return (
    <section
      aria-labelledby="advisor-band-heading"
      className="border-t border-[var(--line)] bg-[var(--paper)]"
    >
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="max-w-[560px]">
          <h2
            id="advisor-band-heading"
            className="text-[22px] font-semibold leading-tight text-[var(--ink)]"
          >
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-muted)]">
            {body}
          </p>
        </div>
        <AdvisorLink label={cta} variant="primary" />
      </div>
    </section>
  );
}
