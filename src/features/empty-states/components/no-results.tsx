import { SearchX } from "lucide-react";
import { EmptyState } from "./empty-state";

interface NoResultsProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function NoResults({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: NoResultsProps) {
  return (
    <EmptyState
      icon={<SearchX className="h-10 w-10" />}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      className={className}
    />
  );
}
