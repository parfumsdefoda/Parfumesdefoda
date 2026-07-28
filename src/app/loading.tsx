/**
 * Loading page — displayed while the homepage data is being fetched.
 * Uses skeleton placeholders (no spinners) as per UX constraints.
 *
 * Renders a grid of skeleton cards matching the product card layout.
 * Includes aria-busy for screen reader accessibility.
 */

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8" aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">جاري التحميل...</span>

      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-32 skeleton-pulse rounded-md bg-neutral-200" />
        <div className="flex gap-4">
          <div className="h-10 w-48 skeleton-pulse rounded-md bg-neutral-200" />
          <div className="h-10 w-10 skeleton-pulse rounded-md bg-neutral-200" />
        </div>
      </div>

      {/* Filter sidebar + Grid skeleton */}
      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="space-y-4">
            <div className="h-6 w-24 skeleton-pulse rounded bg-neutral-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 skeleton-pulse rounded bg-neutral-200" />
                <div className="h-4 w-20 skeleton-pulse rounded bg-neutral-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 overflow-hidden"
              >
                {/* Image */}
                <div className="aspect-square skeleton-pulse bg-neutral-200" />
                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 skeleton-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-1/2 skeleton-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-1/4 skeleton-pulse rounded bg-neutral-200" />
                  <div className="flex gap-2">
                    <div className="h-8 w-16 skeleton-pulse rounded-full bg-neutral-200" />
                    <div className="h-8 w-16 skeleton-pulse rounded-full bg-neutral-200" />
                    <div className="h-8 w-16 skeleton-pulse rounded-full bg-neutral-200" />
                  </div>
                  <div className="h-5 w-20 skeleton-pulse rounded bg-neutral-200" />
                  <div className="h-10 w-full skeleton-pulse rounded-lg bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
