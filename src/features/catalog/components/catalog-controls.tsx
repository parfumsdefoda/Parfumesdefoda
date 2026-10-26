"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { SearchBar } from "@/features/search";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  tier: string;
  season: string;
  performance: string;
  size: string;
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
  filters: "الفلاتر",
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
    tier: "الدار",
    season: "الفصل",
    performance: "الأداء",
    size: "المقاس",
  },
};

/** The desktop checkbox panel is fetched on the first pill click. */
const FilterPopover = lazy(() => import("./filter-popover"));

const SEARCH_DEBOUNCE_MS = 250;

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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CatalogControls — filters, sort and search, driven by the URL.
 *
 * Every change rewrites the query string (`router.replace`, no scroll) and the
 * server renders the new grid, so a view is shareable, reloadable and
 * back-button friendly. Nothing is filtered in the browser: the controls only
 * describe the state they were given.
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

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  const [openGroup, setOpenGroup] = useState<{
    key: FilterKey;
    anchor: HTMLButtonElement;
  } | null>(null);

  // Search is the one field that needs a local value while typing. The URL
  // stays authoritative: when the query string changes underneath (back,
  // a link), the field follows it during render — not in an effect.
  const [query, setQueryValue] = useState(state.q);
  const [seenQuery, setSeenQuery] = useState(state.q);
  if (state.q !== seenQuery) {
    setSeenQuery(state.q);
    setQueryValue(state.q);
  }

  const commit = useCallback(
    (next: CatalogState) => {
      const search = serializeCatalogState(next, lockedKeys);
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [lockedKeys, pathname, router],
  );

  // Debounce the search into the URL. The timer reads the *live* query string
  // when it fires, so a filter toggled while the shopper is still typing is
  // never dropped by a stale closure.
  useEffect(() => {
    if (query === state.q) return;
    const timer = setTimeout(() => {
      const current = parseCatalogState(
        Object.fromEntries(new URLSearchParams(window.location.search)),
      );
      if (current.q === query.trim()) return;
      commit(setQuery(current, query));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, state.q, commit]);

  const activeCount = countActiveFilters(state, lockedKeys);
  const openFacet = openGroup
    ? facets.find((group) => group.key === openGroup.key)
    : undefined;
  const activeValues = FILTER_KEYS.filter(
    (key) => !lockedKeys.includes(key),
  ).flatMap((key) => state[key].map((value) => ({ key, value })));
  const showResults = labels.showResults.replace(
    "{count}",
    formatNumber(total),
  );

  const toggle = (key: FilterKey, value: string) =>
    commit(toggleFacetValue(state, key, value));

  const clearAll = () => commit(clearCatalogFilters(state));

  // ─── Pieces ───

  const availableToggle = (
    <div className="flex items-center gap-2.5">
      <Checkbox
        id="catalog-available"
        checked={state.available}
        onCheckedChange={() => commit(setAvailable(state, !state.available))}
        aria-label={labels.availableOnly}
      />
      <Label
        htmlFor="catalog-available"
        className="cursor-pointer text-caption font-normal text-[var(--color-text)]"
      >
        {labels.availableOnly}
      </Label>
    </div>
  );

  const optionsFor = (
    group: FacetGroup,
    variant: "popover" | "sheet",
  ) => (
    <div
      role="group"
      aria-label={labels.groups[group.key]}
      className={cn("flex flex-col gap-1", variant === "sheet" && "gap-3")}
    >
      {group.options.map((option, index) => (
        <FacetRow
          key={option.value}
          id={`catalog-${group.key}-${variant}-${index}`}
          group={group.key}
          option={option}
          checked={state[group.key].includes(option.value)}
          onToggle={() => toggle(group.key, option.value)}
        />
      ))}
    </div>
  );

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Search · count · sort */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <SearchBar
            value={query}
            onChange={setQueryValue}
            placeholder={labels.searchPlaceholder}
            label={labels.search}
            clearLabel={labels.clearSearch}
            className="w-full md:w-72"
          />
          <Button
            ref={sheetTriggerRef}
            variant="secondary"
            className="shrink-0 lg:hidden"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span>{labels.filters}</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-[var(--color-brand)] px-1.5 text-caption font-bold text-white">
                {formatNumber(activeCount)}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p
            aria-live="polite"
            className="text-caption text-[var(--color-text-muted)]"
          >
            {formatNumber(total)} {labels.resultUnit}
          </p>
          <div className="relative">
            <label htmlFor="catalog-sort" className="sr-only">
              {labels.sort}
            </label>
            <select
              id="catalog-sort"
              value={state.sort}
              onChange={(event) =>
                commit(setSort(state, event.target.value as SortOption))
              }
              className={cn(
                "h-11 appearance-none rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)]",
                "ps-4 pe-9 text-caption font-medium text-[var(--color-text)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
              )}
            >
              <option value="featured">{labels.sortFeatured}</option>
              <option value="price-asc">{labels.sortPriceAsc}</option>
              <option value="price-desc">{labels.sortPriceDesc}</option>
              <option value="alphabetical">{labels.sortName}</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Desktop filter bar */}
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        {facets.map((group) => {
          const active = state[group.key].length;
          const expanded = openGroup?.key === group.key;
          return (
            <button
              key={group.key}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={expanded}
              onClick={(event) => {
                const anchor = event.currentTarget;
                setOpenGroup((current) =>
                  current?.key === group.key
                    ? null
                    : { key: group.key, anchor },
                );
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-caption font-medium",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                active > 0
                  ? "border-[var(--color-brand)] bg-[var(--purple-50)] text-[var(--color-brand)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--ui-border-strong)]",
              )}
            >
              <span>{labels.groups[group.key]}</span>
              {active > 0 && (
                <span className="text-caption font-bold tabular-nums">
                  {formatNumber(active)}
                </span>
              )}
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </button>
          );
        })}

        {openGroup && openFacet && (
          <Suspense fallback={null}>
            <FilterPopover
              anchor={openGroup.anchor}
              group={openFacet}
              title={labels.groups[openFacet.key]}
              active={state[openFacet.key]}
              onToggle={(value) =>
                commit(toggleFacetValue(state, openFacet.key, value))
              }
              onClose={() => setOpenGroup(null)}
            />
          </Suspense>
        )}

        <div className="inline-flex h-10 items-center rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          {availableToggle}
        </div>

        {activeCount > 0 && (
          <Button variant="tertiary" onClick={clearAll}>
            {labels.clearAll}
          </Button>
        )}
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
              className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-caption text-[var(--color-text)] transition-colors hover:border-[var(--ui-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
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
              className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-caption text-[var(--color-text)] transition-colors hover:border-[var(--ui-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {labels.availableOnly}
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
          {state.q && (
            <button
              type="button"
              onClick={() => {
                setQueryValue("");
                commit(setQuery(state, ""));
              }}
              aria-label={`${labels.remove} ${state.q}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-caption text-[var(--color-text)] transition-colors hover:border-[var(--ui-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              «{state.q}»
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Mobile / tablet filter sheet */}
      {/* Closing returns focus to the button that opened the sheet. */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) sheetTriggerRef.current?.focus();
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[88vh] gap-0 rounded-t-card p-0"
        >
          <SheetHeader className="border-b border-[var(--color-border)] px-4 py-3">
            <SheetTitle className="text-body font-bold">
              {labels.filters}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {facets.map((group) => (
              <section
                key={group.key}
                className="border-b border-[var(--color-border)] py-4 last:border-b-0"
              >
                <h3 className="mb-3 text-caption font-bold text-[var(--color-text)]">
                  {labels.groups[group.key]}
                </h3>
                {optionsFor(group, "sheet")}
              </section>
            ))}
            <section className="py-4">{availableToggle}</section>
          </div>

          <SheetFooter className="border-t border-[var(--color-border)] px-4 py-3">
            <Button
              variant="primary"
              className="w-full font-bold"
              onClick={() => {
                setSheetOpen(false);
                sheetTriggerRef.current?.focus();
              }}
            >
              {showResults}
            </Button>
            <Button variant="tertiary" onClick={clearAll}>
              {labels.clearAll}
            </Button>
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
      className={cn(
        "flex items-center gap-2.5 rounded-control px-1.5 py-1.5",
        "hover:bg-[var(--ui-surface-muted)]",
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
          "flex-1 text-caption font-normal text-[var(--color-text)]",
          empty ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        {option.label}
      </Label>
      <span className="text-caption tabular-nums text-[var(--color-text-muted)]">
        {formatNumber(option.count)}
      </span>
    </div>
  );
}
