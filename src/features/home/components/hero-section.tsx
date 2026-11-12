import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdvisorLink } from "./advisor-link";

export interface HeroSectionProps {
  /** The page's real <h1>. */
  heading: string;
  /** One supporting sentence. */
  lead: string;
  shopCta: string;
  advisorCta: string;
}

/**
 * HeroSection — a full-bleed editorial banner, directly under the header.
 *
 * It is a letterbox on desktop (16/5, at least 300px) and a tall portrait plate
 * on phones (4/5, capped at 70svh): the proportion does the work, so the artwork
 * can be a single wide photograph and the type still has room on a phone.
 *
 * Product photography is never pulled in here — the banner renders only from
 * tokens (deep purple to brand purple, a soft radial light, a diamond lattice
 * under 8% opacity, one gold hairline at the bottom), so no file from /products/
 * can leak into the first screen.
 *
 * The scrim is part of the design, not an afterthought: the overlay always sits
 * on a dark gradient of its own, which is what keeps the kicker, headline and
 * copy above 4.5:1 whatever is behind them.
 *
 * No sentinel, no header offset: the bar is in the flow now, so the banner is
 * simply the first block on the page and nothing overlaps it.
 */
export function HeroSection({ heading, lead, shopCta, advisorCta }: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero relative isolate w-full overflow-hidden border-b border-[var(--brand-gold)] bg-[var(--purple-950)] aspect-[4/5] max-h-[70svh] md:aspect-[16/5] md:min-h-[300px] md:max-h-none"
    >
      {/* Decoration only — nothing here is content or a link target. */}
      <span aria-hidden="true" className="hero-glow" />
      <span aria-hidden="true" className="hero-lattice" />
      <span aria-hidden="true" className="hero-ring" />
      <span aria-hidden="true" className="hero-scrim" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col items-start justify-end gap-3 p-6 md:gap-4 md:p-12 lg:p-16">
        <span className="text-[14px] font-medium uppercase tracking-[0.2em] text-[var(--gold-300)]">
          بارفان دي فودا
        </span>

        <h1
          id="hero-heading"
          className="hero-heading max-w-[24ch] text-[34px] font-semibold leading-[1.15] text-[var(--color-on-dark)] md:text-[56px] [text-wrap:balance]"
        >
          {heading}
        </h1>

        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-on-dark-muted)] [text-wrap:pretty]">
          {lead}
        </p>

        <div className="hero-cta mt-2 flex flex-wrap items-center gap-4">
          <Button
            render={<Link href="/shop" />}
            size="lg"
            className="h-12 bg-[var(--color-brand)] px-6 font-semibold text-[var(--color-on-brand)] hover:bg-[var(--purple-700)] focus-visible:ring-offset-[var(--purple-950)]"
          >
            {shopCta}
          </Button>
          <AdvisorLink label={advisorCta} />
        </div>
      </div>
    </section>
  );
}
