"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import {
  FILTER_KEYS,
  clearCatalogFilters,
  countActiveFilters,
  facetValueLabel,
  removeFacetValue,
  parseCatalogState,
  serializeCatalogState,
  setAvailable,
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
  foda: string;
}

export interface CatalogControlsLabels {
  searchPlaceholder: string;
  search: string;
  clearSearch: string;
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
  groups: CatalogGroupLabels;
}

export const DEFAULT_CONTROLS_LABELS: CatalogControlsLabels = {
  searchPlaceholder: "ابحث عن عطرك...",
  search: "بحث",
  clearSearch: "مسح البحث",
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
  groups: {
    gender: "الجنس",
    style: "النوع",
    form: "الصيغة",
    tier: "الدار",
    performance: "الأداء",
    size: "المقاس",
    foda: "عطور فوده الأصلية",
  },
};

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CatalogControlsProps {
  state: CatalogState;
  facets: FacetGroup[];
  total: number;
  labels?: Partial<CatalogControlsLabels>;
  /**
   * Groups the route has locked (a category page pins gender). They are not
   * offered as chips and never written back into the URL, because the route
   * already says it.
   */
  lockedKeys?: readonly FilterKey[];
}

interface SortChoice {
  value: SortOption;
  label: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CatalogControls — one bar and one drawer, driven by the URL.
 *
 * The bar holds only the count and a single "الفلاتر والترتيب" trigger: no search
 * field, no row of pills, no per-group popover. The drawer opens from the inline
 * end at every width, lists the groups as hairline accordions with their live
 * counts, then the sort radios, and closes on the purple "عرض N منتج". Every
 * change rewrites the query string (`router.replace`, no scroll) and the server
 * renders the new grid, so a view stays shareable and back-button friendly.
 */
export function CatalogControls({
  state,
  facets,
  total,
  labels: labelOverrides,
  lockedKeys = [],
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

  const toggle = (key: FilterKey, value: string) => commit(toggleFacetValue(state, key, value));
  const clearAll = () => commit(clearCatalogFilters(state));

  const sortChoices: SortChoice[] = [
    { value: "price-asc", label: labels.sortPriceAsc },
    { value: "price-desc", label: labels.sortPriceDesc },
    { value: "alphabetical", label: labels.sortName },
  ];

  const closeDrawer = () => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Count · single drawer trigger */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
        <p
          aria-live="polite"
          className="text-[14px] tabular-nums text-[var(--ink-muted)]"
        >
          {formatNumber(total)} {labels.resultUnit}
        </p>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="inline-flex h-11 items-center gap-2 border border-[var(--line)] bg-transparent px-4 text-[14px] font-medium text-[var(--ink)] transition-colors duration-100 hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span>{labels.filters}</span>
          {activeCount > 0 && (
            <span className="min-w-4 text-center text-[14px] font-bold tabular-nums text-[var(--purple-700)]">
              {formatNumber(activeCount)}
            </span>
          )}
        </button>
      </div>

      {/* Active chips */}
      {(activeValues.length > 0 || state.available || state.q) && (
        <div className="flex flex-wrap items-center gap-2">
          {activeValues.map(({ key, value }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              onClick={() => commit(removeFacetValue(state, key, value))}
              aria-label={`${labels.remove} ${facetValueLabel(key, value)}`}
              className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-transparent px-2.5 py-1.5 text-[14px] text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {facetValueLabel(key, value)}
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}
          {state.available && (
            <button
              type="button"
              onClick={() => commit(setAvailable(state, false))}
              aria-label={`${labels.remove} ${labels.availableOnly}`}
              className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-transparent px-2.5 py-1.5 text-[14px] text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {labels.availableOnly}
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
          {state.q && (
            <button
              type="button"
              onClick={() => commit({ ...state, q: "" })}
              aria-label={`${labels.remove} ${state.q}`}
              className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-transparent px-2.5 py-1.5 text-[14px] text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              «{state.q}»
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* The one drawer — same component on phone and desktop */}
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
          else setDrawerOpen(true);
        }}
      >
        <SheetContent
          side="left"
          // The sheet's own `data-[side=left]:w-3/4` wins over a plain w-full,
          // so the width is set through the same variant: full-bleed on phones,
          // the sheet's 384px column from sm up.
          className="gap-0 bg-[var(--paper)] p-0 data-[side=left]:w-full sm:data-[side=left]:w-[384px]"
        >
          <SheetHeader className="border-b border-[var(--line)] px-5 py-4">
            <SheetTitle className="text-[15px] font-semibold">{labels.filters}</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <Accordion className="w-full">
              {facets.map((group) => {
                const active = state[group.key].length;
                return (
                  <AccordionItem key={group.key} value={group.key} className="border-b border-[var(--line)]">
                    <AccordionTrigger className="py-4 text-[14px] font-medium hover:no-underline">
                      <span className="flex items-center gap-2">
                        {labels.groups[group.key]}
                        {active > 0 && (
                          <span className="text-[14px] font-bold tabular-nums text-[var(--purple-700)]">
                            {formatNumber(active)}
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div role="group" aria-label={labels.groups[group.key]} className="flex flex-col">
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
                );
              })}

              <AccordionItem value="available" className="border-b border-[var(--line)]">
                <AccordionTrigger className="py-4 text-[14px] font-medium hover:no-underline">
                  {labels.availableOnly}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="flex items-center gap-2.5 py-1">
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

              <AccordionItem value="sort" className="border-b border-[var(--line)]">
                <AccordionTrigger className="py-4 text-[14px] font-medium hover:no-underline">
                  {labels.sort}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div role="radiogroup" aria-label={labels.sort} className="flex flex-col">
                    {sortChoices.map((choice) => {
                      const selected = state.sort === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => commit(setSort(state, choice.value))}
                          className={cn(
                            "flex items-center justify-between gap-3 border-b border-[var(--line)] py-2.5 text-start text-[14px] last:border-b-0",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                            selected ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-muted)]",
                          )}
                        >
                          {choice.label}
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-3.5 w-3.5 border border-[var(--ink)]",
                              selected ? "bg-[var(--purple-700)]" : "bg-transparent",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="border-t border-[var(--line)] px-5 py-4">
            <Button variant="primary" className="w-full font-semibold" onClick={closeDrawer}>
              {showResults}
            </Button>
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 w-full py-1 text-[14px] text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {labels.clearAll}
            </button>
          </div>
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
      className={cn(
        "flex items-center gap-2.5 py-1.5",
        empty && "opacity-50",
      )}
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
