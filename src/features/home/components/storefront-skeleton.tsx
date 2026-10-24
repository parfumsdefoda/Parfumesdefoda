/**
 * Homepage skeleton — the fallback while the best-seller counts resolve.
 *
 * Mirrors the real page's rhythm (hero band, search row, product grid) so the
 * swap costs as little layout shift as possible. Skeletons only, no spinners,
 * and `aria-busy` for screen readers (see AGENTS.md).
 */

export interface StorefrontSkeletonProps {
  /** sr-only + status text, resolved from locales/ar.json by the page. */
  label?: string;
}

export function StorefrontSkeleton({ label = "جاري التحميل..." }: StorefrontSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">{label}</span>

      {/* Hero band — same height as the marquee section it replaces. */}
      <div className="hero-mesh border-y border-[var(--color-gold)]/20">
        <div className="container mx-auto px-4 pt-6">
          <div className="mx-auto h-6 w-64 skeleton-pulse rounded-pill bg-[var(--neutral-200)]" />
          <div className="mx-auto mt-2 h-1 w-16 rounded-pill bg-[var(--neutral-200)]" />
        </div>
        <div className="overflow-hidden py-6">
          <div className="flex gap-4 ps-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-40 w-40 shrink-0 rounded-2xl skeleton-pulse bg-[var(--neutral-100)] sm:h-56 sm:w-56"
              />
            ))}
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-[var(--space-section)]">
        <div className="mb-8 h-10 w-full max-w-md skeleton-pulse rounded-control bg-[var(--neutral-100)]" />

        <div className="flex gap-8">
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="space-y-4">
              <div className="h-6 w-24 skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-4 w-32 skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-[var(--neutral-100)]"
                >
                  <div className="aspect-[4/5] skeleton-pulse bg-[var(--neutral-100)]" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
                    <div className="h-3 w-1/2 skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
                    <div className="h-5 w-20 skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
                    <div className="h-10 w-full skeleton-pulse rounded-control bg-[var(--neutral-100)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
