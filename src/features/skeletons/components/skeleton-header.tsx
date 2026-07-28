import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonHeaderProps {
  className?: string;
}

export function SkeletonHeader({ className }: SkeletonHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/60 ${className ?? ""}`}
      role="status"
      aria-busy="true"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Skeleton className="h-8 w-32 rounded" />

        {/* Nav — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </header>
  );
}
