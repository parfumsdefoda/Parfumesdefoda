import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductMetaLineProps {
  /** Already-composed parts — see `cardMetaParts` in `@/lib/card-presentation`. */
  parts: string[];
  /** Premium (فاخر): the first part is the frame's word and wears the gold. */
  premium?: boolean;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductMetaLine — the small line above a product name.
 *
 * One renderer for the grid card and the product page, so the premium prefix
 * can never drift between them. The diamond is an inline SVG, `aria-hidden`,
 * and the word uses `--color-gold-text` (gold-700, 5.1:1 on ivory) — never
 * `--brand-gold`, which is a hairline colour.
 *
 * Purely presentational: safe in both server and client trees.
 */
export function ProductMetaLine({ parts, premium = false, className }: ProductMetaLineProps) {
  if (parts.length === 0) return null;

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-caption", className)}>
      {parts.map((part, index) => {
        const first = index === 0;
        const isPremiumWord = premium && first;

        return (
          <span key={`${part}-${index}`} className="flex items-center gap-1.5">
            {!first && (
              <span aria-hidden="true" className="text-[var(--color-text-muted)]">
                ·
              </span>
            )}
            {isPremiumWord ? (
              <span className="flex items-center gap-1 font-bold text-[var(--color-gold-text)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 8 8"
                  className="size-2 shrink-0"
                  focusable="false"
                >
                  <path d="M4 0 8 4 4 8 0 4Z" fill="currentColor" />
                </svg>
                {part}
              </span>
            ) : (
              <span className="text-[var(--color-text-muted)]">{part}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}
