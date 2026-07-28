interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Simple scroll area using overflow-y-auto.
 * Avoids adding another Shadcn dependency.
 */
export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <div className={`overflow-y-auto ${className ?? ""}`}>{children}</div>
  );
}
