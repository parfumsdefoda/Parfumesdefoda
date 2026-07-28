import { SkeletonCard } from "./skeleton-card";

interface SkeletonGridProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Number of columns on desktop */
  desktopCols?: number;
  className?: string;
}

export function SkeletonGrid({
  count = 8,
  desktopCols = 4,
  className,
}: SkeletonGridProps) {
  const gridCols =
    desktopCols === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : desktopCols === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={`grid ${gridCols} gap-6 ${className ?? ""}`}
      role="status"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
