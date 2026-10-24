"use client";

import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import type { FacetGroup } from "@/lib/catalog-query";

export interface FilterPopoverProps {
  /** The pill that opened this popover; it is also the focus target on close. */
  anchor: HTMLButtonElement;
  group: FacetGroup;
  title: string;
  active: string[];
  onToggle: (value: string) => void;
  onClose: () => void;
}

/**
 * FilterPopover — the desktop checkbox panel for one filter group.
 *
 * Loaded on demand: the bar renders plain buttons, and this module (Base UI's
 * popover positioning included) is fetched the first time a shopper opens a
 * group. That keeps the catalogue's first paint free of a floating-layer
 * runtime most visitors on a phone never need.
 */
export default function FilterPopover({
  anchor,
  group,
  title,
  active,
  onToggle,
  onClose,
}: FilterPopoverProps) {
  return (
    <Popover.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          anchor.focus();
        }
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <Popover.Popup
            initialFocus
            finalFocus={() => anchor}
            className="w-64 rounded-card border border-[var(--color-border)] bg-[var(--bg-primary)] p-2 text-caption shadow-lifted"
          >
            <div
              role="group"
              aria-label={title}
              className="flex flex-col gap-1"
            >
              {group.options.map((option, index) => {
                const checked = active.includes(option.value);
                const empty = option.count === 0 && !checked;
                const id = `catalog-popover-${group.key}-${index}`;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2.5 rounded-control px-1.5 py-1.5 hover:bg-[var(--ui-surface-muted)]",
                      empty && "opacity-50",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={empty}
                      onCheckedChange={() => onToggle(option.value)}
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
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
