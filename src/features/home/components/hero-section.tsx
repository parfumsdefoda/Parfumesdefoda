import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import type { Product } from "@/types";
import { AdvisorLink } from "./advisor-link";

export interface HeroSectionProps {
  /** The page's real <h1>. */
  heading: string;
  /** One supporting sentence. */
  lead: string;
  shopCta: string;
  advisorCta: string;
  /**
   * One to three bottles from the catalogue itself, centre first.
   * Selected by `selectHeroProducts` — never a placeholder or a stock photo.
   */
  bottles: Product[];
}

/** Widths and heights of the three plates: the centre bottle is the subject. */
const PLATE_WIDTH: Record<"centre" | "flank", string> = {
  centre: "w-[46%] sm:w-[44%] h-[236px] sm:h-[290px] md:h-[330px] -mx-[16%]",
  flank: "w-[38%] h-[168px] sm:h-[200px] md:h-[240px]",
};

/** How much of the frame the composition is allowed to take on a phone. */
const PLATE_SIZE = {
  centre: "(max-width: 767px) 46vw, 210px",
  flank: "(max-width: 767px) 30vw, 150px",
} as const;

/**
 * HeroSection — the first thing on the homepage.
 *
 * The visual is built from the store's own bottles: a large centre bottle with
 * two smaller flanking ones, overlapping slightly so they read as one group,
 * over the brand's darkest purple with a soft gold glow behind the centre and
 * a quiet ellipse of ground shadow under each base. Nothing is re-photographed
 * and nothing is invented — every bottle is a real product with a transparent
 * derived image, and each one links to its own page.
 *
 * The centre bottle is the page's largest paint, so it is eager with a high
 * fetch priority; the flanking two stay lazy. The section renders completely
 * without JavaScript.
 */
export function HeroSection({
  heading,
  lead,
  shopCta,
  advisorCta,
  bottles,
}: HeroSectionProps) {
  const centre = bottles[0] ?? null;
  const flanks = bottles.slice(1, 3);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative border-b-2 border-[var(--brand-gold)] bg-[var(--purple-950)]"
    >
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 px-4 pb-[var(--space-8)] pt-[var(--space-8)] md:grid-cols-[minmax(0,1fr)_minmax(0,520px)] md:gap-10 md:pb-[var(--space-16)] md:pt-[var(--space-16)]">
        <div className="flex max-w-[560px] flex-col gap-4">
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

        {centre && (
          <div className="relative mx-auto h-[228px] w-full max-w-[420px] self-end sm:h-[300px] md:mx-auto md:h-[330px] md:max-w-[460px]">
            {/* The gold glow and the ground are decoration: CSS only, so the
                section still reads the same with images blocked. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[22%] top-[4%] bottom-[12%] rounded-full bg-[radial-gradient(ellipse_at_center,var(--brand-gold)_0%,transparent_68%)] opacity-25 blur-3xl"
            />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
              {flanks[0] && (
                <BottlePlate
                  product={flanks[0]}
                  plate="flank"
                  className="z-10 translate-y-3"
                />
              )}
              <BottlePlate product={centre} plate="centre" className="z-20" />
              {flanks[1] && (
                <BottlePlate
                  product={flanks[1]}
                  plate="flank"
                  className="z-10 translate-y-3"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface BottlePlateProps {
  product: Product;
  plate: "centre" | "flank";
  className?: string;
}

/**
 * One bottle in the composition.
 *
 * The plate is a link to the product with the product name as its accessible
 * name — the composition is navigation, not decoration. The shadow under the
 * base is a blurred ellipse, reused from the card stage in reverse (dark on
 * light instead of light on dark).
 */
function BottlePlate({ product, plate, className }: BottlePlateProps) {
  const isCentre = plate === "centre";

  return (
    <Link
      href={`/product/${product.slug}`}
      aria-label={product.name}
      className={`group relative block rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)] ${PLATE_WIDTH[plate]} ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[20%] bottom-[2%] h-[4%] rounded-full bg-[var(--color-on-dark)] opacity-10 blur-lg"
      />
      <ProductImage
        slug={product.slug}
        src={product.image}
        name={product.name}
        tier="card"
        frame="thumb"
        sizes={PLATE_SIZE[plate]}
        priority={isCentre}
        altPrefix=""
        frameClassName="bg-transparent"
        className={`origin-bottom bg-transparent transition-transform duration-[var(--duration-slow)] ease-[var(--ease-apple)] motion-safe:group-hover:scale-[1.03] ${isCentre ? "scale-[1.42]" : "scale-[1.28]"}`}
      />
    </Link>
  );
}
