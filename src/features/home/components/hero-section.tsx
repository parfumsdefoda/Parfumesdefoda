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
 * HeroSection — the first thing on the homepage, and deliberately product-free.
 *
 * The owner does not want product photography in the top area, so the
 * composition is type and CSS only: no <img>, no <picture>, no background image
 * and no preload. The depth comes from a soft gold glow, a diamond lattice that
 * fades out radially and two concentric rotated-square outlines that echo the
 * logo's diamond — all `aria-hidden` decoration, all tokens.
 *
 * The section still carries `data-hero-sentinel`: the header capsule watches it
 * to flip from the dark tone to the light one once the hero scrolled behind it.
 * It eats the page's header offset with a negative margin, so the hero runs
 * under the floating capsule while its content keeps its own top padding.
 *
 * With no image to wait for, the largest paint on this page is the headline
 * text itself. The one-time entrance is pure CSS, never loops, and is switched
 * off entirely under `prefers-reduced-motion`.
 */
export function HeroSection({ heading, lead, shopCta, advisorCta }: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      data-hero-sentinel=""
      className="hero relative isolate -mt-[var(--header-offset)] border-b-2 border-[var(--brand-gold)] bg-[var(--purple-950)]"
    >
      {/* Decoration only — nothing here is content or a link target. */}
      <span aria-hidden="true" className="hero-glow" />
      <span aria-hidden="true" className="hero-lattice" />
      <span aria-hidden="true" className="hero-rings">
        <span className="hero-ring" />
        <span className="hero-ring" />
      </span>

      <div className="relative mx-auto flex min-h-[calc(100svh-var(--header-offset))] w-full max-w-[960px] flex-col items-center justify-center gap-5 px-4 pb-[var(--space-12)] pt-[calc(var(--header-offset)+var(--space-12))] text-center md:gap-6 md:pb-[var(--space-16)] md:pt-[calc(var(--header-offset)+var(--space-16))]">
        <span aria-hidden="true" className="hero-ornament" />

        <h1
          id="hero-heading"
          className="hero-heading text-display max-w-[18ch] font-bold text-[var(--color-on-dark)]"
        >
          {heading}
        </h1>

        <p className="hero-lead text-body max-w-[560px] text-[var(--color-on-dark-muted)]">
          {lead}
        </p>

        <div className="hero-cta mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Button
            render={<Link href="/shop" />}
            size="lg"
            className="bg-[var(--color-on-dark)] font-bold text-[var(--purple-950)] hover:bg-[var(--purple-100)] focus-visible:ring-offset-[var(--purple-950)]"
          >
            {shopCta}
          </Button>
          <AdvisorLink label={advisorCta} />
        </div>
      </div>
    </section>
  );
}
