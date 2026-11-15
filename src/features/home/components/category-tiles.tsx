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
 * CategoryTiles — three hairline cells into the shelves.
 *
 * No photography and no cards: the section is a band divided by 1px lines, each
 * cell carrying the shelf's name and its real count in type. A category with no
 * visible products is not rendered at all.
 */
export function CategoryTiles({ title, tiles, countLabel }: CategoryTilesProps) {
  const visible = tiles.filter((tile) => tile.count > 0);
  if (visible.length === 0) return null;

  return (
    <section
      aria-labelledby="categories-heading"
      className="border-t border-[var(--line)] bg-[var(--paper)]"
    >
      <div className="mx-auto w-full max-w-[1920px] px-4 pt-10 sm:px-6 sm:pt-14">
        <h2
          id="categories-heading"
          className="text-[14px] font-medium text-[var(--ink-muted)]"
        >
          {title}
        </h2>
      </div>

      <ul className="mx-auto mt-4 grid w-full max-w-[1920px] grid-cols-1 border-t border-[var(--line)] sm:grid-cols-3">
        {visible.map((tile) => (
          <li key={tile.href} className="border-b border-[var(--line)] sm:border-b-0 sm:border-e sm:last:border-e-0">
            <Link
              href={tile.href}
              className="group flex h-full flex-col justify-between gap-10 px-4 py-7 transition-colors hover:bg-[var(--paper-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)] sm:px-6 sm:py-9"
            >
              <span className="text-[22px] font-semibold leading-tight text-[var(--ink)] sm:text-[26px]">
                {tile.label}
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] tabular-nums text-[var(--ink-muted)]">
                  {countLabel.replace("{count}", formatNumber(tile.count))}
                </span>
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4 text-[var(--ink)] transition-transform duration-100 group-hover:-translate-x-1"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
