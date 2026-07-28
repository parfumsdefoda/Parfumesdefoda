import { ShoppingBag } from "lucide-react";
import { EmptyState } from "./empty-state";

interface EmptyCartProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyCart({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyCartProps) {
  return (
    <EmptyState
      icon={<ShoppingBag className="h-10 w-10" />}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      className={className}
    />
  );
}
