"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { normalizeArabic } from "@/lib/search-helpers";
import { formatNumber } from "@/lib/currency";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  slug: string;
  name: string;
  /** PUBLIC tier label + scent style. Never `house`, never `دووب`. */
  meta: string;
}

export interface HeaderSearchLabels {
  placeholder: string;
  submit: string;
  suggestions: string;
  viewAll: string;
  /** Template with `{n}`, e.g. "‏{n} نتيجة". */
  resultsCount: string;
  noResults: string;
}

export interface HeaderSearchProps {
  labels: HeaderSearchLabels;
  /** `desktop` is the pill in the bar; `panel` fills the phone search row. */
  variant?: "desktop" | "panel";
  autoFocus?: boolean;
  className?: string;
  /** Called after Escape / navigation, so the phone panel can close itself. */
  onClose?: () => void;
}

/**
 * HeaderSearch — the site search.
 *
 * The suggestion index is fetched ONCE, lazily, the first time the field is
 * focused; the catalogue never enters the layout or a client bundle. Filtering
 * happens here with the same Arabic normalisation the /shop search uses, and
 * the list is text only (name + public meta), per the header's no-images rule.
 *
 * Keyboard: the input is a real combobox — ArrowUp/Down move the active option,
 * Enter opens it, Escape closes the list (and the panel, on phones).
 */
export function HeaderSearch({
  labels,
  variant = "desktop",
  autoFocus = false,
  className,
  onClose,
}: HeaderSearchProps) {
  const router = useRouter();
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<SearchSuggestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState<SearchSuggestion[]>([]);
  const [active, setActive] = useState(-1);

  const loadIndex = useCallback(async () => {
    if (indexRef.current) return;
    indexRef.current = [];
    try {
      const response = await fetch("/api/search-index", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: SearchSuggestion[] };
      indexRef.current = Array.isArray(data.items) ? data.items : [];
      setIndex(indexRef.current);
    } catch {
      // A failed suggestion fetch must never block typing or submitting.
    }
  }, []);

  const needle = normalizeArabic(query.trim());
  const matches = needle
    ? index
        .filter((item) => normalizeArabic(`${item.name} ${item.meta}`).includes(needle))
        .slice(0, 6)
    : [];

  const options = [...matches.map((item) => item.slug), "__all__"];
  const open = focused && needle !== "" && (matches.length > 0 || query.trim() !== "");
  const showEmpty = focused && needle !== "" && index.length > 0 && matches.length === 0;

  const close = useCallback(() => {
    setFocused(false);
    setActive(-1);
  }, []);

  const go = useCallback(
    (slug: string) => {
      close();
      if (slug === "__all__") {
        router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      } else {
        router.push(`/product/${slug}`);
      }
    },
    [close, query, router],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (open || query !== "") {
        event.preventDefault();
        close();
        return;
      }
      onClose?.();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      // ArrowDown on a field that still holds a query is the visitor asking
      // for the list back: reopen it instead of doing nothing.
      if (!open && query.trim() !== "") {
        setFocused(true);
        setActive(0);
        return;
      }
      const next = active + 1 >= options.length ? 0 : active + 1;
      setActive(open ? next : -1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = active - 1 < 0 ? options.length - 1 : active - 1;
      setActive(open ? next : -1);
      return;
    }
    if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      go(options[active]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        action="/shop"
        method="get"
        role="search"
        onSubmit={(event) => {
          if (open && active >= 0) {
            event.preventDefault();
            go(options[active]);
          }
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {labels.submit}
        </label>
        <div
          className={cn(
            "flex items-center gap-1 rounded-pill border",
            "transition-[width,background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
            // Desktop: the capsule's own tone tokens, so the field reads on
            // glass in both tones and never looks disabled.
            variant === "desktop"
              ? "h-9 w-[190px] border-[var(--header-field-border)] bg-[var(--header-field)] focus-within:w-[320px] focus-within:bg-[var(--header-field-strong)]"
              : "h-11 w-full border-[var(--color-border-strong)] bg-[var(--color-surface)]",
          )}
        >
          <Search
            aria-hidden="true"
            className={cn(
              "ms-3 size-4 shrink-0",
              variant === "desktop"
                ? "text-[var(--header-fg-muted)]"
                : "text-[var(--color-text-muted)]",
            )}
          />
          <input
            id={inputId}
            type="search"
            name="q"
            autoFocus={autoFocus}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${inputId}-option-${active}` : undefined}
            placeholder={labels.placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              // Typing is using the field: after Escape dismissed the list, the
              // next keystroke must bring it back instead of staying silent
              // until the visitor blurs and focuses again.
              setFocused(true);
              if (!indexRef.current) void loadIndex();
            }}
            onFocus={() => {
              setFocused(true);
              void loadIndex();
            }}
            onBlur={(event) => {
              if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
                close();
              }
            }}
            onKeyDown={onKeyDown}
            className={cn(
              "h-full w-full min-w-0 bg-transparent px-1 text-caption focus-visible:outline-none",
              variant === "desktop"
                ? "text-[var(--header-fg)] placeholder:text-[var(--header-fg-muted)]"
                : "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
            )}
          />
          <button
            type="submit"
            aria-label={labels.submit}
            className={cn(
              "me-1 inline-flex size-8 shrink-0 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
              variant === "desktop"
                ? "text-[var(--header-fg-muted)] hover:text-[var(--header-fg)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-brand)]",
            )}
          >
            <Search aria-hidden="true" className="size-4" />
          </button>
        </div>
      </form>

      <span role="status" aria-live="polite" className="sr-only">
        {open ? labels.resultsCount.replace("{n}", formatNumber(matches.length)) : ""}
      </span>

      {(open || showEmpty) && (
        <div
          id={listId}
          role="listbox"
          aria-label={labels.suggestions}
          className={cn(
            "absolute inset-x-0 top-full z-50 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lifted",
            // The desktop list opens BELOW the floating capsule, not on top of
            // its bottom hairline: the pill sits 12px inside the capsule, so
            // the gap has to clear the capsule's own edge.
            variant === "desktop" ? "mt-4 min-w-80" : "mt-2 w-full",
          )}
        >
          {showEmpty ? (
            <p className="px-4 py-3 text-caption text-[var(--color-text-muted)]">
              {labels.noResults}
            </p>
          ) : (
            <>
              {matches.map((item, position) => (
                <button
                  key={item.slug}
                  type="button"
                  id={`${inputId}-option-${position}`}
                  role="option"
                  aria-selected={active === position}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(position)}
                  onClick={() => go(item.slug)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-start transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]",
                    active === position && "bg-[var(--color-surface-muted)]",
                  )}
                >
                  <span className="text-caption font-bold text-[var(--color-text)]">
                    {item.name}
                  </span>
                  <span className="text-caption text-[var(--color-text-muted)]">{item.meta}</span>
                </button>
              ))}
              {query.trim() !== "" && (
                <button
                  type="button"
                  id={`${inputId}-option-${matches.length}`}
                  role="option"
                  aria-selected={active === matches.length}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go("__all__")}
                  className={cn(
                    "flex w-full items-center gap-2 border-t border-[var(--color-border)] px-4 py-3 text-caption font-bold text-[var(--color-brand)] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]",
                    active === matches.length && "bg-[var(--color-surface-muted)]",
                  )}
                >
                  <Search aria-hidden="true" className="size-4" />
                  {labels.viewAll}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
