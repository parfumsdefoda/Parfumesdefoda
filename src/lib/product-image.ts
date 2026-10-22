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

export interface ManifestFile {
  /** Rendered width in pixels (derived frames are square). */
  w: number;
  avif?: string;
  webp?: string;
}

export interface ManifestEntry {
  /** Original file this was derived from (kept as the ultimate fallback). */
  source: string;
  background: "transparent" | "pure-white" | "off-white";
  /** `multiply` makes a white cut-out vanish into the stage. */
  blend: ImageBlend;
  canvas: number;
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
    height: largest.w,
    blend: entry.blend,
  };
}
