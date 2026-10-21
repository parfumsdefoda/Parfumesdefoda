import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonSidebarProps {
  /** Number of filter group placeholders */
  groups?: number;
  /** Number of checkbox items per group */
  itemsPerGroup?: number;
  className?: string;
}

export function SkeletonSidebar({
  groups = 3,
  itemsPerGroup = 4,
  className,
}: SkeletonSidebarProps) {
  return (
    <div
      className={`space-y-6 ${className ?? ""}`}
      role="status"
      aria-busy="true"
    >
      {Array.from({ length: groups }).map((_, gi) => (
        <div key={gi} className="space-y-3">
          <Skeleton className="h-5 w-20 rounded-control" />
          {Array.from({ length: itemsPerGroup }).map((_, ii) => (
            <div key={ii} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-pill" />
              <Skeleton className="h-4 w-16 rounded-control" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
