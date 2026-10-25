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
  /** Alt text for the product plate. */
  imageAlt: string;
}

/**
 * HeroSection — the first thing on the homepage.
 *
 * A dark band with the brand's purple at the bottom of its range, a gold
 * hairline closing it, one white pill CTA and one quiet advisor link. The
 * product plate is the store's own photograph, served as one <picture> so a
 * phone downloads the tall crop and a laptop the wide one — art direction is
 * the one thing next/image cannot express, which is why this is a raw <img>
 * with explicit dimensions and a high fetch priority.
 *
 * No JavaScript: the hero renders and is complete before hydration.
 */
export function HeroSection({
  heading,
  lead,
  shopCta,
  advisorCta,
  imageAlt,
}: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative border-b-2 border-[var(--brand-gold)] bg-[var(--purple-950)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-[var(--space-12)] pt-[var(--space-12)] md:pb-[var(--space-16)] md:pt-[var(--space-16)]">
        <div className="flex max-w-[640px] flex-col gap-4">
          <h1
            id="hero-heading"
            className="text-display font-bold text-[var(--color-on-dark)]"
          >
            {heading}
          </h1>
          <p className="text-body text-[var(--color-on-dark-muted)]">{lead}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
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

        {/* Two art-directed crops (the tall plate for phones, the wide one for
            laptops) need <picture>; next/image emits one ratio per request. */}
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero-mobile.webp"
            width={400}
            height={244}
          />
          <img
            src="/images/hero-desktop.webp"
            width={1750}
            height={284}
            alt={imageAlt}
            fetchPriority="high"
            decoding="async"
            className="mt-8 h-auto w-full rounded-card bg-[var(--color-on-dark)] object-contain md:mt-10"
          />
        </picture>
      </div>
    </section>
  );
}
