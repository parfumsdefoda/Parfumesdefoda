"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import {
  FILTER_KEYS,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  removeFacetValue,
  serializeCatalogState,
  setAvailable,
  setQuery,
  setSort,
  toggleFacetValue,
  type CatalogState,
  type FilterKey,
} from "@/lib/catalog-filters";
import type { FacetGroup, FacetOption } from "@/lib/catalog-query";
import type { SortOption } from "@/lib/sort-helpers";

// ─── Labels ─────────────────────────────────────────────────────────────────

export interface CatalogGroupLabels {
  gender: string;
  style: string;
  form: string;
  tier: string;
  performance: string;
  size: string;
}

export interface CatalogControlsLabels {
  /** One button opens the drawer: "الفلاتر والترتيب". */
  filters: string;
  clearAll: string;
  availableOnly: string;
  /** Unit shown after the result count, e.g. "منتج". */
  resultUnit: string;
  sort: string;
  sortFeatured: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortName: string;
  /** "عرض {count} منتج" */
  showResults: string;
  /** Accessible prefix of a chip's remove button. */
  remove: string;
  /** Accessible name of the drawer. */
  drawerTitle: string;
  groups: CatalogGroupLabels;
}

export const DEFAULT_CONTROLS_LABELS: CatalogControlsLabels = {
  filters: "الفلاتر والترتيب",
  clearAll: "مسح الكل",
  availableOnly: "المتوفر فقط",
  resultUnit: "منتج",
  sort: "الترتيب",
  sortFeatured: "الافتراضي",
  sortPriceAsc: "الأقل سعرًا",
  sortPriceDesc: "الأعلى سعرًا",
  sortName: "الاسم (أ-ي)",
  showResults: "عرض {count} منتج",
  remove: "إزالة",
  drawerTitle: "الفلاتر والترتيب",
  groups: {
    gender: "الجنس",
    style: "النوع",
    form: "الصيغة",
    tier: "الدار",
    performance: "الأداء",
    size: "المقاس",
  },
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CatalogControlsProps {
  state: CatalogState;
  facets: FacetGroup[];
  total: number;
  labels?: Partial<CatalogControlsLabels>;
  /** Groups the route has locked (a category page pins gender). */
  lockedKeys?: readonly FilterKey[];
  /** Crumbs shown at the inline-start end of the bar. */
  breadcrumb?: BreadcrumbItem[];
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CatalogControls — one bar and one drawer.
 *
 * The bar holds the breadcrumb, the live result count and a single
 * "الفلاتر والترتيب" button; there are no facet pills, no popovers and no
 * search field (the header owns search). The drawer groups every facet as an
 * accordion with live counts, offers the sort as radios, and closes on
 * "عرض N منتج".
 *
 * Every change rewrites the query string (`router.replace`, no scroll) and the
 * server renders the new grid, so a view is shareable, reloadable and
 * back-button friendly. Nothing is filtered in the browser.
 */
export function CatalogControls({
  state,
  facets,
  total,
  labels: labelOverrides,
  lockedKeys = [],
  breadcrumb = [],
}: CatalogControlsProps) {
  const labels = { ...DEFAULT_CONTROLS_LABELS, ...labelOverrides };
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const commit = useCallback(
    (next: CatalogState) => {
      const search = serializeCatalogState(next, lockedKeys);
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [lockedKeys, pathname, router],
  );

  const activeCount = countActiveFilters(state, lockedKeys);
  const activeValues = FILTER_KEYS.filter((key) => !lockedKeys.includes(key)).flatMap((key) =>
    state[key].map((value) => ({ key, value })),
  );
  const showResults = labels.showResults.replace("{count}", formatNumber(total));
  const visibleFacets = facets.filter((group) => !lockedKeys.includes(group.key));

  const toggle = (key: FilterKey, value: string) => commit(toggleFacetValue(state, key, value));
  const clearAll = () => commit(clearCatalogFilters(state));

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "featured", label: labels.sortFeatured },
    { value: "price-asc", label: labels.sortPriceAsc },
    { value: "price-desc", label: labels.sortPriceDesc },
    { value: "alphabetical", label: labels.sortName },
  ];

  const chipClass =
    "inline-flex items-center gap-1.5 border-b border-[var(--color-brand)] pb-0.5 text-[14px] text-[var(--ink)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]";

  return (
    <div>
      {/* ─── The bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
        <nav aria-label="breadcrumb" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1.5 text-[14px] text-[var(--ink-muted)]">
            {breadcrumb.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-[var(--ink)]">
                    {crumb.label}
                  </span>
                )}
                {index < breadcrumb.length - 1 && (
                  <span aria-hidden="true" className="text-[var(--line)]">
                    /
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <p
          aria-live="polite"
          className="order-last w-full text-[14px] text-[var(--ink-muted)] sm:order-none sm:w-auto"
        >
          {formatNumber(total)} {labels.resultUnit}
        </p>

        <Button
          ref={triggerRef}
          variant="outline"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="gap-2 border-[var(--line)] bg-transparent text-[14px] font-medium text-[var(--ink)] hover:bg-[var(--paper-deep)]"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {labels.filters}
          {activeCount > 0 && (
            <span className="ms-1 bg-[var(--color-brand)] px-1.5 py-0.5 text-[14px] font-bold leading-none text-[var(--color-on-brand)]">
              {formatNumber(activeCount)}
            </span>
          )}
        </Button>
      </div>

      {/* ─── Active filters, as small removable text chips ─── */}
      {(activeValues.length > 0 || state.available || state.q) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line-soft)] py-3">
          {activeValues.map(({ key, value }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              onClick={() => commit(removeFacetValue(state, key, value))}
              aria-label={`${labels.remove} ${facetValueLabel(key, value)}`}
              className={chipClass}
            >
              {facetValueLabel(key, value)}
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ))}
          {state.available && (
            <button
              type="button"
              onClick={() => commit(setAvailable(state, false))}
              aria-label={`${labels.remove} ${labels.availableOnly}`}
              className={chipClass}
            >
              {labels.availableOnly}
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
          {state.q && (
            <button
              type="button"
              onClick={() => commit(setQuery(state, ""))}
              aria-label={`${labels.remove} ${state.q}`}
              className={chipClass}
            >
              «{state.q}»
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="ms-auto text-[14px] font-medium text-[var(--color-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              {labels.clearAll}
            </button>
          )}
        </div>
      )}

      {/* ─── The one drawer ─── */}
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) triggerRef.current?.focus();
        }}
      >
        <SheetContent
          // The inline-end edge in an RTL document is the physical left.
          side="left"
          className="w-full gap-0 border-[var(--line)] bg-[var(--paper)] p-0 text-[var(--ink)] sm:max-w-md"
        >
          <SheetHeader className="border-b border-[var(--line)] px-4 py-4">
            <SheetTitle className="text-[16px] font-semibold text-[var(--ink)]">
              {labels.drawerTitle}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <Accordion>
              {visibleFacets.map((group) => (
                <AccordionItem key={group.key} value={group.key}>
                  <AccordionTrigger className="py-4 text-[14px] font-medium text-[var(--ink)] hover:no-underline">
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{labels.groups[group.key]}</span>
                      {state[group.key].length > 0 && (
                        <span className="text-[var(--color-brand)]">
                          {formatNumber(state[group.key].length)}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div
                      role="group"
                      aria-label={labels.groups[group.key]}
                      className="flex flex-col"
                    >
                      {group.options.map((option, index) => (
                        <FacetRow
                          key={option.value}
                          id={`catalog-${group.key}-${index}`}
                          group={group.key}
                          option={option}
                          checked={state[group.key].includes(option.value)}
                          onToggle={() => toggle(group.key, option.value)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}

              <AccordionItem value="available">
                <AccordionTrigger className="py-4 text-[14px] font-medium text-[var(--ink)] hover:no-underline">
                  {labels.availableOnly}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="catalog-available"
                      checked={state.available}
                      onCheckedChange={() => commit(setAvailable(state, !state.available))}
                      aria-label={labels.availableOnly}
                    />
                    <Label
                      htmlFor="catalog-available"
                      className="cursor-pointer text-[14px] font-normal text-[var(--ink)]"
                    >
                      {labels.availableOnly}
                    </Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sort">
                <AccordionTrigger className="py-4 text-[14px] font-medium text-[var(--ink)] hover:no-underline">
                  {labels.sort}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <fieldset className="flex flex-col gap-1">
                    <legend className="sr-only">{labels.sort}</legend>
                    {sortOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2.5 py-2 text-[14px] text-[var(--ink)]"
                      >
                        <input
                          type="radio"
                          name="catalog-sort"
                          value={option.value}
                          checked={state.sort === option.value}
                          onChange={() => commit(setSort(state, option.value))}
                          className="size-4 accent-[var(--color-brand)]"
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <SheetFooter className="border-t border-[var(--line)] px-4 py-4">
            <Button
              variant="primary"
              className="h-12 w-full text-[14px] font-semibold"
              onClick={() => {
                setDrawerOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {showResults}
            </Button>
            {activeCount > 0 && (
              <Button variant="tertiary" onClick={clearAll} className="text-[14px]">
                {labels.clearAll}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── One facet option ───────────────────────────────────────────────────────

function FacetRow({
  id,
  group,
  option,
  checked,
  onToggle,
}: {
  id: string;
  group: FilterKey;
  option: FacetOption;
  checked: boolean;
  onToggle: () => void;
}) {
  const empty = option.count === 0 && !checked;

  return (
    <div
      className={cn("flex items-center gap-2.5 py-2", empty && "opacity-50")}
      data-filter-group={group}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={empty}
        onCheckedChange={onToggle}
        aria-label={option.label}
      />
      <Label
        htmlFor={id}
        className={cn(
          "flex-1 text-[14px] font-normal text-[var(--ink)]",
          empty ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        {option.label}
      </Label>
      <span className="text-[14px] tabular-nums text-[var(--ink-muted)]">
        {formatNumber(option.count)}
      </span>
    </div>
  );
}
