"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  /** Manifest key for the derived assets. */
  slug: string | null;
  /** Original file, used when no derivative exists. */
  src: string;
}

export interface ProductGalleryLabels {
  /** Accessible name of a thumbnail: "صورة ٢". `{n}` is replaced. */
  thumbnail: string;
  /** Accessible name of the zoom control. */
  zoom: string;
  /** Dialog title (the product name). */
  zoomTitle: string;
  /** Label of the dot strip on phones. */
  slides: string;
  /** Shown instead of a photo when the catalogue has none yet. */
  comingSoon: string;
}

export interface ProductGalleryProps {
  images: GalleryImage[];
  name: string;
  labels: ProductGalleryLabels;
  /** Coming-soon products keep the muted stage — there is no photo yet. */
  comingSoon?: boolean;
}

/**
 * ProductGallery — the photos, and the one place they get large.
 *
 * Desktop: a 4:5 stage with a thumbnail row underneath. Phone: the same images
 * as a CSS scroll-snap strip with dots, so a swipe is the native gesture and
 * no JavaScript drives the animation. A tap or a click on any photo opens the
 * same zoom dialog, which traps focus and returns it to the photo afterwards.
 *
 * The photo is a real button, not a div with a click handler, so the keyboard
 * reaches the zoom exactly like a finger does.
 */
export function ProductGallery({
  images,
  name,
  labels,
  comingSoon = false,
}: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const strip = useRef<HTMLDivElement>(null);

  if (comingSoon || images.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-card bg-[var(--color-surface-muted)]">
        <span className="rounded-pill border border-[var(--color-border)] px-5 py-2 text-headline font-bold text-[var(--color-text-muted)]">
          {labels.comingSoon}
        </span>
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  const goTo = (index: number) => {
    setSelected(index);
    const node = strip.current;
    if (node) {
      node.scrollTo({ left: index * node.clientWidth, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="w-[min(92vw,760px)] max-w-none gap-0 p-2 sm:max-w-[760px]">
          <DialogTitle className="sr-only">{labels.zoomTitle}</DialogTitle>
          <ProductImage
            slug={current.slug}
            src={current.src}
            name={name}
            tier="pdp"
            frame="thumb"
            sizes="92vw"
            frameClassName="aspect-square w-full bg-transparent"
            className="scale-[1.3]"
          />
        </DialogContent>
      </Dialog>

      {/* Phone: one swipeable strip. */}
      <div className="md:hidden">
        <div
          ref={strip}
          role="group"
          aria-label={labels.slides}
          onScroll={(event) => {
            const node = event.currentTarget;
            if (node.clientWidth === 0) return;
            const index = Math.round(node.scrollLeft / node.clientWidth);
            if (index !== selected && index >= 0 && index < images.length) {
              setSelected(index);
            }
          }}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <div key={`${image.src}-${index}`} className="w-full shrink-0 snap-center">
              <button
                type="button"
                onClick={() => {
                  setSelected(index);
                  setZoomOpen(true);
                }}
                aria-label={`${labels.zoom} — ${name} (${labels.thumbnail.replace("{n}", String(index + 1))})`}
                className="block w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              >
                <ProductImage
                  slug={image.slug}
                  src={image.src}
                  name={name}
                  tier="pdp"
                  frame="stage"
                  sizes="100vw"
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  decorative
                />
              </button>
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {images.map((image, index) => (
              <button
                key={`${image.src}-dot-${index}`}
                type="button"
                onClick={() => goTo(index)}
                aria-label={labels.thumbnail.replace("{n}", String(index + 1))}
                aria-current={index === selected}
                className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              >
                {/* The dot stays small; the 24px box is the touch target. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-colors",
                    index === selected
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-border-strong)]",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: stage + thumbnails. */}
      <div className="hidden flex-col gap-3 md:flex">
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label={labels.zoom}
          className="group relative block w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <ProductImage
            slug={current.slug}
            src={current.src}
            name={name}
            tier="pdp"
            frame="stage"
            sizes="(max-width: 1280px) 50vw, 600px"
            priority
            decorative
          />
          <span
            aria-hidden="true"
            className="absolute bottom-3 end-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)]/90 text-[var(--color-text)] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        {images.length > 1 && (
          <div className="flex gap-3">
            {images.map((image, index) => (
              <button
                key={`${image.src}-thumb-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={labels.thumbnail.replace("{n}", String(index + 1))}
                aria-pressed={index === selected}
                className={cn(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-control border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                  index === selected
                    ? "border-[var(--color-brand)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <ProductImage
                  slug={image.slug}
                  src={image.src}
                  name={name}
                  tier="card"
                  frame="thumb"
                  sizes="80px"
                  decorative
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
