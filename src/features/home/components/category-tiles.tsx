import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/currency";

export interface CategoryTile {
  label: string;
  href: string;
  /** Visible products in this category — the shelf's real size. */
  count: number;
}

export interface CategoryTilesProps {
  title: string;
  tiles: CategoryTile[];
  /** "N عطر" — `{count}` is replaced per tile. */
  countLabel: string;
}

/**
 * CategoryTiles — typographic links into the three shelves.
 *
 * No photography: the labels and the counts carry it, which is both honest
 * (thin categories would look emptier with a big image) and free. A category
 * with no visible products is not rendered at all.
 */
export function CategoryTiles({ title, tiles, countLabel }: CategoryTilesProps) {
  const visible = tiles.filter((tile) => tile.count > 0);
  if (visible.length === 0) return null;

  return (
    <section
      aria-labelledby="categories-heading"
      className="mx-auto w-full max-w-[1280px] px-4 pb-[var(--space-section)]"
    >
      <h2
        id="categories-heading"
        className="mb-6 text-title-2 font-bold text-[var(--color-text)]"
      >
        {title}
      </h2>

      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-6">
        {visible.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="group flex h-full flex-col justify-between gap-8 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors duration-[var(--duration-base)] ease-[var(--ease-apple)] hover:border-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              <span className="text-title-3 font-bold text-[var(--color-text)]">
                {tile.label}
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-caption text-[var(--color-text-muted)]">
                  {countLabel.replace("{count}", formatNumber(tile.count))}
                </span>
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4 text-[var(--color-brand)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-apple)] group-hover:-translate-x-1"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
