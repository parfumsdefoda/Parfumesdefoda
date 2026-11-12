import Link from "next/link";
import {
  ProductGrid,
  type GridColumns,
  type ProductCardLabels,
} from "@/features/products";
import type { CatalogView } from "@/lib/catalog-query";
import {
  CatalogControls,
  type BreadcrumbItem,
  type CatalogControlsLabels,
} from "./catalog-controls";
import type { FilterKey } from "@/lib/catalog-filters";

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
  /** Filter groups the route owns (a category page pins gender). */
  lockedKeys?: readonly FilterKey[];
  /** Crumbs for the bar above the grid. */
  breadcrumb?: BreadcrumbItem[];
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
  lockedKeys,
  breadcrumb,
}: CatalogSectionProps) {
  return (
    <section>
      <h2 className="sr-only">{labels.title}</h2>

      <CatalogControls
        state={view.state}
        facets={view.facets}
        total={view.total}
        labels={controlsLabels}
        lockedKeys={lockedKeys}
        breadcrumb={breadcrumb}
      />

      {view.total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[16px] font-semibold text-[var(--ink)]">{labels.emptyTitle}</p>
          <p className="text-[14px] text-[var(--ink-muted)]">{labels.emptyHint}</p>
          <Link
            href="/shop"
            className="mt-2 inline-flex h-11 items-center border border-[var(--color-brand)] px-5 text-[14px] font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--purple-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
          >
            {labels.clearFilters}
          </Link>
        </div>
      ) : (
        <ProductGrid products={view.products} columns={columns} labels={cardLabels} />
      )}
    </section>
  );
}
