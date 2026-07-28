"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "./scroll-area";
import { FilterGroup, type FilterGroupProps } from "./filter-group";

export interface FilterSidebarProps {
  /** Array of filter groups */
  groups: FilterGroupProps[];
  /** Label for the heading */
  heading?: string;
  /** Label for the clear button */
  clearLabel?: string;
  /** Label for the close button (mobile) */
  closeLabel?: string;
  /** Number of active filters (for badge) */
  activeCount?: number;
  /** Called when "clear all" is pressed */
  onClearAll?: () => void;
  /** Whether sidebar is open on mobile */
  open?: boolean;
  /** Called to close mobile sidebar */
  onClose?: () => void;
  className?: string;
}

export function FilterSidebar({
  groups,
  heading = "تصفية",
  clearLabel = "إزالة التصفية",
  closeLabel = "إغلاق التصفية",
  activeCount = 0,
  onClearAll,
  open = false,
  onClose,
  className,
}: FilterSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block w-64 shrink-0 ${className ?? ""}`}
        aria-label={heading}
      >
        <SidebarContent
          groups={groups}
          heading={heading}
          clearLabel={clearLabel}
          activeCount={activeCount}
          onClearAll={onClearAll}
        />
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-[var(--bg-primary)] shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--neutral-600)]" />
                <span className="font-semibold text-[var(--neutral-800)]">
                  {heading}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={closeLabel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <SidebarContent
                groups={groups}
                heading={heading}
                clearLabel={clearLabel}
                activeCount={activeCount}
                onClearAll={onClearAll}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  groups,
  heading,
  clearLabel,
  activeCount = 0,
  onClearAll,
}: Pick<
  FilterSidebarProps,
  "groups" | "heading" | "clearLabel" | "activeCount" | "onClearAll"
>) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--neutral-600)]" />
          <span className="font-semibold text-[var(--neutral-800)]">
            {heading}
          </span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && onClearAll && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearAll}
            className="text-[var(--color-accent)] hover:text-[var(--color-accent)]/80"
          >
            {clearLabel}
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[calc(100vh-12rem)]">
        {groups.map((group) => (
          <FilterGroup
            key={group.name}
            name={group.name}
            options={group.options}
            activeSlugs={group.activeSlugs}
            onToggle={group.onToggle}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
