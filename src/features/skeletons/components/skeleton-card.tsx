import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  /** Number of size pill placeholders to show */
  sizePills?: number;
  /** Show badge placeholder */
  showBadge?: boolean;
  /** Show rating placeholder */
  showRating?: boolean;
  className?: string;
}

export function SkeletonCard({
  sizePills = 3,
  showBadge = true,
  showRating = true,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-primary)] ${className ?? ""}`}
    >
      {/* Image */}
      <div className="relative aspect-square">
        <Skeleton className="absolute inset-0 rounded-none" />
        {showBadge && (
          <Skeleton className="absolute top-2.5 right-2.5 h-5 w-16 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        {showRating && <Skeleton className="h-3 w-20 rounded" />}

        {/* Size pills */}
        <div className="flex gap-2">
          {Array.from({ length: sizePills }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>

        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
