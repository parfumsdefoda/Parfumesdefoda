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

/**
 * SearchBar — the catalogue toolbar's search field.
 *
 * It wears the same tokens as the header's search pill (surface fill, a 1px
 * `--color-border-strong` edge, the brand focus ring) at the same 44px height
 * as the header's panel field, so the two searches read as one control and the
 * catalogue field never looks greyed out or disabled. Icons sit on logical
 * edges, so RTL mirrors without a second rule.
 */
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
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
      <Input
        id="search-bar"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-pill border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] ps-10 pe-11 text-caption text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-0"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onChange("")}
          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label={clearLabel}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
