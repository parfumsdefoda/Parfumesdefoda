"use client";

import { useEffect } from "react";

/**
 * Runtime safety net for the derived product photos.
 *
 * `scripts/check-derived-images.mjs` fails the build when a *visible* product
 * is missing a derivative, so this should never fire in a healthy deploy. It
 * exists for the other cases: a file removed from the deployed volume, a CDN
 * purge gone wrong, a partial rsync. In a `<picture>` a 404 on a `<source>`
 * does NOT fall back to the next source — the slot just stays empty — so the
 * failed image is swapped to the original photo the catalogue still ships.
 *
 * One listener for the whole document: no per-image client component, so the
 * LCP photo stays server-rendered and hydration is unchanged.
 */

export const DERIVED_PREFIX = "/products/derived/";

/**
 * The original a failed derived file should fall back to, or null when the
 * failed URL is not a derived asset (or the element carries no original).
 */
export function originalForFailedAsset(
  failedUrl: string | null | undefined,
  original: string | null | undefined,
): string | null {
  if (!failedUrl || !original) return null;
  if (!failedUrl.includes(DERIVED_PREFIX)) return null;
  return original;
}

export function DerivedImageFallback() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;

      const next = originalForFailedAsset(
        target.currentSrc || target.src,
        target.dataset.original,
      );
      if (!next || target.dataset.fallbackApplied === "true") return;

      // Guard against a loop when the original is missing too.
      target.dataset.fallbackApplied = "true";
      target.removeAttribute("srcset");
      target.src = next;
    };

    // Image error events do not bubble; capture is what makes one listener work.
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  return null;
}
