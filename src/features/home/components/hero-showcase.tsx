"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HeroShowcaseItem {
  id: string;
  /** Product slug — frames link to `/product/{slug}` */
  slug: string;
  name: string;
  image: string;
  /** فاخر (featured) products get the gold frame treatment */
  featured: boolean;
}

interface HeroShowcaseProps {
  /** Pre-selected products for the marquee (computed server-side per load) */
  items: HeroShowcaseItem[];
  /** Small heading above the marquee */
  title?: string;
  /** Accessible label for the marquee region */
  ariaLabel?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * HeroShowcase — animated "living catalog" banner.
 *
 * An infinite horizontal marquee of product images in elegant frames:
 *   - Seamless loop via the duplicated-track trick (CSS translateX -50%)
 *   - Every frame is clickable and navigates to the product's page
 *   - فاخر (featured) products get a soft gold outline + glow
 *   - Pauses on hover, disabled under prefers-reduced-motion
 *   - next/image with priority for the first frames, lazy for the rest
 *   - The track is dir="ltr" so the animation is direction-agnostic
 *
 * The selection is randomized server-side per page load (page.tsx) and
 * passed in as props — no client-side fetching, no hydration mismatch.
 */
export function HeroShowcase({
  items,
  title,
  ariaLabel = "تشكيلة العطور",
}: HeroShowcaseProps) {
  if (items.length === 0) return null;

  // The track renders the list twice for the seamless infinite loop;
  // the second copy is aria-hidden — it is purely visual.

  const renderFrame = (item: HeroShowcaseItem, index: number) => {
    const frame = (
      <>
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 160px, 224px"
          className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-105"
          quality={80}
          priority={index < 2}
          loading={index < 2 ? undefined : "lazy"}
        />
        {/* فاخر mini-badge on featured frames */}
        {item.featured && (
          <span
            className={cn(
              "absolute end-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
              "bg-gradient-to-l from-[#b8960c] via-[#d4af37] to-[#f5d060]",
              "shadow-[0_1px_4px_rgba(212,175,55,0.4)]",
            )}
          >
            ★ فاخر
          </span>
        )}
      </>
    );

    // Clickable frame — navigates to the product's own page (same route
    // pattern as product-card.tsx).
    if (item.slug) {
      return (
        <Link
          key={`${item.id}-${index}`}
          href={`/product/${item.slug}`}
          title={item.name}
          aria-label={item.name}
          className={cn(
            "group relative mx-2 block h-40 w-40 shrink-0 overflow-hidden rounded-2xl sm:h-56 sm:w-56",
            "bg-[var(--bg-primary)] shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
            "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.14)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
            item.featured
              ? "border-2 border-[var(--color-gold)]/70 shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
              : "border border-[var(--neutral-100)]",
          )}
        >
          {frame}
        </Link>
      );
    }

    return (
      <div
        key={`${item.id}-${index}`}
        title={item.name}
        className={cn(
          "relative mx-2 h-40 w-40 shrink-0 overflow-hidden rounded-2xl sm:h-56 sm:w-56",
          "bg-[var(--bg-primary)] shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
          item.featured
            ? "border-2 border-[var(--color-gold)]/70 shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
            : "border border-[var(--neutral-100)]",
        )}
      >
        {frame}
      </div>
    );
  };

  return (
    <section
      aria-label={ariaLabel}
      className={cn("hero-mesh relative overflow-hidden", "border-y border-[var(--color-gold)]/20")}
    >
      {title && (
        <div className="container mx-auto px-4 pt-6 text-center">
          <h2 className="text-lg font-extrabold text-[var(--neutral-800)] sm:text-xl">
            {title}
          </h2>
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-16 rounded-full bg-gradient-to-l from-[#b8960c] via-[#d4af37] to-[#f5d060]"
          />
        </div>
      )}

      {/*
        dir="ltr" MUST be on this overflow container, not just on the track.
        In an RTL document a `width: max-content` child is laid out from the
        container's RIGHT edge, so the track's origin sits at
        `container.right - trackWidth` and the visible window shows the tail of
        the duplicated set. The animation then slides content off into empty
        space on the right and snaps back — the seam this fixes.
        With the container LTR, the track starts at the container's left edge
        and translateX(-50%) lands the duplicate set exactly where set 1 began.
      */}
      <div dir="ltr" className="marquee overflow-hidden py-6">
        {/* The track itself is also LTR so the loop math is direction-agnostic */}
        <div dir="ltr" className="marquee-track flex w-max">
          <div className="flex">
            {items.map((item, i) => renderFrame(item, i))}
          </div>
          <div className="flex" aria-hidden="true">
            {items.map((item, i) => renderFrame(item, i))}
          </div>
        </div>
      </div>
    </section>
  );
}