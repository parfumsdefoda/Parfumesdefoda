import { AdvisorLink } from "./advisor-link";

export interface AdvisorBandProps {
  title: string;
  body: string;
  cta: string;
}

/**
 * AdvisorBand — the one invitation to the perfume advisor, mid-page.
 *
 * A dark band so it reads as a change of mode rather than another product
 * block. The only gold is the hairline above it; the button itself is a quiet
 * outline. Nothing here claims more than the panel does (it asks a few
 * questions and suggests from the real catalogue).
 */
export function AdvisorBand({ title, body, cta }: AdvisorBandProps) {
  return (
    <section
      aria-labelledby="advisor-band-heading"
      className="border-t border-[var(--brand-gold)] bg-[var(--purple-950)]"
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-[var(--space-section)] md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="max-w-[560px]">
          <h2
            id="advisor-band-heading"
            className="text-title-2 font-bold text-[var(--color-on-dark)]"
          >
            {title}
          </h2>
          <p className="mt-2 text-body text-[var(--color-on-dark-muted)]">
            {body}
          </p>
        </div>
        <AdvisorLink label={cta} variant="secondary" />
      </div>
    </section>
  );
}
