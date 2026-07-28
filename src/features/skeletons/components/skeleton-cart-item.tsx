import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCartItemProps {
  className?: string;
}

export function SkeletonCartItem({ className }: SkeletonCartItemProps) {
  return (
    <div
      className={`flex gap-4 p-4 ${className ?? ""}`}
      role="status"
      aria-busy="true"
    >
      <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-8 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
}
