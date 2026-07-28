"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when value changes (controlled) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Accessible label for the search input */
  label?: string;
  /** Accessible label for the clear button */
  clearLabel?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "ابحث...",
  label = "بحث",
  clearLabel = "مسح البحث",
  className,
}: SearchBarProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor="search-bar" className="sr-only">
        {label}
      </label>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-400)] pointer-events-none"
        aria-hidden="true"
      />
      <Input
        id="search-bar"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 ps-10 pe-10 rounded-full bg-[var(--bg-secondary)] border-[var(--border-light)] focus-visible:border-[var(--color-accent)] focus-visible:ring-[var(--color-accent)]/20"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] hover:text-[var(--neutral-700)]"
          aria-label={clearLabel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
