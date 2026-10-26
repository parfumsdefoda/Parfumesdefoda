"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Icon element (Lucide icon) */
  icon: React.ReactNode;
  /** Primary heading */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional CTA button label */
  actionLabel?: string;
  /** Optional CTA button handler */
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`reveal flex flex-col items-center justify-center py-16 px-4 text-center ${className ?? ""}`}
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--neutral-400)]">
        {icon}
      </div>
      <h3 className="text-headline font-bold text-[var(--neutral-800)] mb-2">
        {title}
      </h3>
      <p className="text-caption text-[var(--neutral-500)] max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
