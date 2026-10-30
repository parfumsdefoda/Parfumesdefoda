/* eslint-disable @next/next/no-img-element -- the derived AVIF/WebP tiers are
   built by scripts/build-images.mjs and need two <source> elements per frame;
   next/image can only emit one format per request, so <picture> is the point. */

import { cn } from "@/lib/utils";
import { buildProductImageSources, type ImageTier } from "@/lib/product-image";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductImageFrame = "stage" | "thumb";

export interface ProductImageProps {
  /** Product slug — resolves the derived assets in the image manifest. */
  slug?: string | null;
  /** Original image path. Used verbatim when no derivative exists. */
  src: string;
  /** Product name — the only source of the Arabic alt text. */
  name: string;
  /** Card-sized derivatives (≤800px) or product-page ones (≤2000px). */
  tier?: ImageTier;
  /**
   * `stage` = the 4:5 product stage (muted backdrop + ground shadow);
   * `thumb` = fill the caller's sized box (cart row, gallery thumb, chat card).
   */
  frame?: ProductImageFrame;
  /** `sizes` attribute — required, because a wrong value downloads the wrong tier. */
  sizes: string;
  /** Above-the-fold image: eager + high fetch priority. */
  priority?: boolean;
  loading?: "eager" | "lazy";
  /** Classes for the <img> itself (hover transforms, padding). */
  className?: string;
  /** Classes for the frame wrapper. */
  frameClassName?: string;
  /** Bottle word used in the alt text. Matches locales/ar.json → product.imageAltPrefix. */
  altPrefix?: string;
  /** Decorative image (the surrounding control already has an accessible name). */
  decorative?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductImage — every product photo on the site goes through this.
 *
 * One stage, one set of assets: the derived files are pre-normalised to the
 * same subject size, so the catalogue reads as one shoot instead of 40. The
 * `<picture>` ladder serves AVIF, then WebP, then the untouched original.
 */
export function ProductImage({
  slug,
  src,
  name,
  tier = "card",
  frame = "thumb",
  sizes,
  priority = false,
  loading = "lazy",
  className,
  frameClassName,
  altPrefix = "زجاجة",
  decorative = false,
}: ProductImageProps) {
  const sources = buildProductImageSources(slug, tier);
  const alt = decorative ? "" : `${altPrefix} ${name}`.trim();

  // The derived canvas is square; on a 4:5 stage `cover` crops only the empty
  // side margins (the subject never exceeds 72% of the canvas), which is what
  // keeps the bottle the same size on every card. Originals keep `contain`.
  // A `framed` family is the untouched photo (retouch pending): it is shown
  // whole and never cropped, exactly like its original.
  const imgClassName = cn(
    "absolute inset-0 h-full w-full",
    sources
      ? sources.mode === "framed"
        ? "object-contain"
        : frame === "stage"
          ? "object-cover"
          : "object-contain"
      : "object-contain p-4",
    className,
  );

  return (
    <span
      className={cn(
        "relative block overflow-hidden bg-[var(--ui-surface-muted)]",
        frame === "stage" ? "aspect-[4/5] w-full" : "h-full w-full",
        frameClassName,
      )}
    >
      {frame === "stage" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[26%] bottom-[11%] h-[3%] rounded-full bg-[var(--neutral-300)] opacity-50 blur-md"
        />
      )}

      {sources ? (
        <picture>
          {sources.avif && (
            <source type="image/avif" srcSet={sources.avif} sizes={sizes} />
          )}
          <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
          <img
            src={sources.src}
            srcSet={sources.srcSet}
            sizes={sizes}
            alt={alt}
            width={sources.width}
            height={sources.height}
            loading={priority ? "eager" : loading}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            // Read by <DerivedImageFallback> when a derived file 404s.
            data-original={src}
            className={imgClassName}
            style={
              sources.blend === "multiply"
                ? { mixBlendMode: "multiply" }
                : undefined
            }
          />
        </picture>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : loading}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={imgClassName}
        />
      )}
    </span>
  );
}
