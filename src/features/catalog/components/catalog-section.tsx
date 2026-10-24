import Link from "next/link";
import {
  ProductGrid,
  type GridColumns,
  type ProductCardLabels,
} from "@/features/products";
import type { CatalogView } from "@/lib/catalog-query";
import {
  CatalogControls,
  type CatalogControlsLabels,
} from "./catalog-controls";

export interface CatalogSectionLabels {
  /** Visually hidden heading for the catalogue section. */
  title: string;
  emptyTitle: string;
  emptyHint: string;
  clearFilters: string;
}

export interface CatalogSectionProps {
  view: CatalogView;
  columns: GridColumns;
  cardLabels?: Partial<ProductCardLabels>;
  controlsLabels?: Partial<CatalogControlsLabels>;
  labels: CatalogSectionLabels;
}

/**
 * CatalogSection — the catalogue, rendered on the server.
 *
 * The grid is real HTML on first paint (all products, indexable), while the
 * controls are a small client island that rewrites the URL. Filters therefore
 * cost a navigation, not a client-side re-render of 40 cards.
 */
export function CatalogSection({
  view,
  columns,
  cardLabels,
  controlsLabels,
  labels,
}: CatalogSectionProps) {
  return (
    <section className="container mx-auto px-4 py-[var(--space-section)]">
      <h2 className="sr-only">{labels.title}</h2>

      <CatalogControls
        state={view.state}
        facets={view.facets}
        total={view.total}
        labels={controlsLabels}
      />

      {view.total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-body font-bold text-[var(--color-text)]">
            {labels.emptyTitle}
          </p>
          <p className="text-caption text-[var(--color-text-muted)]">
            {labels.emptyHint}
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex h-11 items-center rounded-pill border border-[var(--color-brand)] px-5 text-caption font-bold text-[var(--color-brand)] transition-colors hover:bg-[var(--purple-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            {labels.clearFilters}
          </Link>
        </div>
      ) : (
        <ProductGrid
          products={view.products}
          columns={columns}
          labels={cardLabels}
        />
      )}
    </section>
  );
}
