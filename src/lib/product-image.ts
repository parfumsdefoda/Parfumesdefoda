/**
 * Product image lookup — client-safe.
 *
 * The derived assets are produced by scripts/build-images.mjs, which writes
 * src/data/image-manifest.json. This module is the only place that reads that
 * manifest, so the component layer never guesses a file name.
 *
 * No `node:fs`, no service imports — safe inside `"use client"` components.
 */

import manifestJson from "@/data/image-manifest.json";

export type ImageTier = "card" | "pdp";
export type ImageBlend = "normal" | "multiply";
/**
 * `cutout` — normalised square cut-out, cropped to the stage.
 * `framed` — the original photo, resize-only, drawn whole (retouch pending).
 */
export type ImageMode = "cutout" | "framed";

export interface ManifestFile {
  /** Rendered width in pixels (cut-out frames are square). */
  w: number;
  /** Real height, recorded for framed (aspect-preserving) files. */
  h?: number;
  avif?: string;
  webp?: string;
}

export interface ManifestEntry {
  /** Original file this was derived from (kept as the ultimate fallback). */
  source: string;
  background: "transparent" | "pure-white" | "off-white" | "coloured";
  /** `multiply` makes a white cut-out vanish into the stage. */
  blend: ImageBlend;
  /** Absent on older entries, which are all cut-outs. */
  mode?: ImageMode;
  canvas: number | null;
  files: ManifestFile[];
}

interface Manifest {
  version: number;
  products: Record<string, ManifestEntry>;
}

const MANIFEST = manifestJson as unknown as Manifest;

/** Largest derivative width a tier is allowed to request. */
const TIER_MAX_WIDTH: Record<ImageTier, number> = {
  card: 800,
  pdp: 2000,
};

/**
 * Manifest key for any product image path.
 *
 * `/products/PF020.png` → `pf020`, `/products/PF091.png` → `pf091`. Gallery
 * views are derived under their own key, so a PDP thumbnail resolves exactly
 * like a cover image — no component has to guess.
 */
export function imageSlug(src?: string | null): string | null {
  if (!src) return null;
  const file = src.split("?")[0].split("/").pop();
  if (!file) return null;
  const dot = file.lastIndexOf(".");
  const base = dot === -1 ? file : file.slice(0, dot);
  return base.toLowerCase() || null;
}

export function getProductImageEntry(slug?: string | null): ManifestEntry | null {
  if (!slug) return null;
  return MANIFEST.products[slug] ?? null;
}

export interface ProductImageSources {
  /** AVIF `<source srcset>` — empty string when no AVIF tier exists. */
  avif: string;
  /** WebP `<source srcset>` — always non-empty for a derived entry. */
  webp: string;
  /** Largest WebP, for the plain `src`. */
  src: string;
  srcSet: string;
  width: number;
  height: number;
  blend: ImageBlend;
  mode: ImageMode;
}

function toSrcSet(files: ManifestFile[], format: "avif" | "webp"): string {
  return files
    .filter((file) => file[format])
    .map((file) => `${file[format]} ${file.w}w`)
    .join(", ");
}

/**
 * Resolve the `<picture>` sources for a product at a tier.
 *
 * Returns null when the product has no derived assets (a manual retouch is
 * pending, or the slug is unknown) — the caller then renders the original.
 */
export function buildProductImageSources(
  slug: string | null | undefined,
  tier: ImageTier,
): ProductImageSources | null {
  const entry = getProductImageEntry(slug);
  if (!entry || entry.files.length === 0) return null;

  const withinTier = entry.files.filter((file) => file.w <= TIER_MAX_WIDTH[tier]);
  const files = withinTier.length > 0 ? withinTier : [entry.files[0]];
  const webp = toSrcSet(files, "webp");
  if (!webp) return null;

  const largest = files[files.length - 1];

  return {
    avif: toSrcSet(files, "avif"),
    webp,
    src: largest.webp as string,
    srcSet: webp,
    width: largest.w,
    height: largest.h ?? largest.w,
    blend: entry.blend,
    mode: entry.mode ?? "cutout",
  };
}
