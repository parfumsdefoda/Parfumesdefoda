"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HeroShowcaseItem {
  id: string;
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

  const renderFrame = (item: HeroShowcaseItem, index: number) => (
    <div
      key={`${item.id}-${index}`}
      title={item.name}
      className={cn(
        "relative mx-2 h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28",
        "bg-[var(--bg-primary)] shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
        item.featured
          ? "border-2 border-[var(--color-gold)]/70 shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
          : "border border-[var(--neutral-100)]",
      )}
    >
      <Image
        src={item.image}
        alt={item.name}
        fill
        sizes="112px"
        className="object-contain p-3"
        quality={80}
        priority={index < 2}
        loading={index < 2 ? undefined : "lazy"}
      />
      {/* فاخر mini-badge on featured frames */}
      {item.featured && (
        <span
          className={cn(
            "absolute end-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white",
            "bg-gradient-to-l from-[#b8960c] via-[#d4af37] to-[#f5d060]",
            "shadow-[0_1px_4px_rgba(212,175,55,0.4)]",
          )}
        >
          ★ فاخر
        </span>
      )}
    </div>
  );

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

      <div className="marquee overflow-hidden py-6">
        {/* dir="ltr" keeps the translateX loop predictable regardless of page RTL */}
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