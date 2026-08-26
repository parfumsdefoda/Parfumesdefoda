/**
 * Product page loading skeleton — displayed while the product data is being fetched.
 * Uses skeleton placeholders (no spinners) as per UX constraints.
 */

export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8" aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">جاري تحميل المنتج...</span>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square w-full skeleton-pulse rounded-2xl bg-neutral-200" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-20 skeleton-pulse rounded-lg bg-neutral-200"
              />
            ))}
          </div>
        </div>

        {/* Product info skeleton */}
        <div className="space-y-6">
          {/* Badge */}
          <div className="h-6 w-20 skeleton-pulse rounded-full bg-neutral-200" />
          {/* Name */}
          <div className="h-8 w-3/4 skeleton-pulse rounded bg-neutral-200" />
          {/* Brand */}
          <div className="h-5 w-1/2 skeleton-pulse rounded bg-neutral-200" />
          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full skeleton-pulse rounded bg-neutral-200" />
            <div className="h-4 w-5/6 skeleton-pulse rounded bg-neutral-200" />
            <div className="h-4 w-2/3 skeleton-pulse rounded bg-neutral-200" />
          </div>
          {/* Separator */}
          <div className="h-px w-full bg-neutral-200" />
          {/* Size options */}
          <div className="space-y-2">
            <div className="h-5 w-24 skeleton-pulse rounded bg-neutral-200" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-24 skeleton-pulse rounded-full bg-neutral-200"
                />
              ))}
            </div>
          </div>
          {/* Price */}
          <div className="h-10 w-32 skeleton-pulse rounded bg-neutral-200" />
          {/* Button */}
          <div className="h-12 w-full skeleton-pulse rounded-full bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
