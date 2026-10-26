"use client";

import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ProductSize } from "@/types";

export interface SizeChooserProps {
  /** Anchored popover on desktop, bottom sheet on touch/mobile. */
  mode: "popover" | "sheet";
  /** The quick-add button the popover hangs off. */
  anchor: RefObject<HTMLButtonElement | null>;
  sizes: ProductSize[];
  labels: { addToCart: string; chooseSize: string };
  onOpenChange: (open: boolean) => void;
  onSelect: (size: ProductSize) => void;
}

/**
 * SizeChooser — the multi-size step of quick add.
 *
 * Loaded as its own chunk the first time a shopper opens it, so a catalogue
 * page never pays for a dialog nobody asked for. Out-of-stock sizes stay
 * visible but disabled and struck, because "which sizes exist" is information.
 */
export default function SizeChooser({
  mode,
  anchor,
  sizes,
  labels,
  onOpenChange,
  onSelect,
}: SizeChooserProps) {
  const [selected, setSelected] = useState<string | null>(
    sizes.find((size) => size.inStock)?.label ?? null,
  );

  const chosen = sizes.find((size) => size.label === selected) ?? null;

  // Roving tabindex: one stop for the whole group, arrows move the selection
  // (and the focus) the way a native radio group does. Only buyable sizes are
  // part of the walk, because the sold-out ones cannot be chosen.
  const radios = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = [
      "ArrowDown",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (!keys.includes(event.key)) return;

    const buyable = sizes.filter((size) => size.inStock);
    if (buyable.length === 0) return;
    event.preventDefault();

    const current = buyable.findIndex((size) => size.label === selected);
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buyable.length - 1;
    else {
      // The list reads right to left, so "back" is the right arrow.
      const forward = event.key === "ArrowDown" || event.key === "ArrowLeft";
      const step = forward ? 1 : -1;
      const from = current === -1 ? (step === 1 ? -1 : 0) : current;
      next = (from + step + buyable.length) % buyable.length;
    }

    const target = buyable[next];
    setSelected(target.label);
    const index = sizes.indexOf(target);
    radios.current[index]?.focus();
  };

  const panel = (caption: boolean) => (
    <>
      {caption && (
        <p className="mb-2 text-caption font-medium text-[var(--color-text-muted)]">
          {labels.chooseSize}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={labels.chooseSize}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-1.5"
      >
        {sizes.map((size, index) => {
          const checked = size.label === selected;
          return (
            <button
              key={size.label}
              ref={(node) => {
                radios.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={!size.inStock}
              tabIndex={checked ? 0 : -1}
              onClick={() => setSelected(size.label)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-control border px-3 py-2.5 text-caption",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                checked
                  ? "border-[var(--color-brand)] bg-[var(--purple-50)] text-[var(--color-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--ui-border-strong)]",
                !size.inStock && "cursor-not-allowed opacity-50 line-through",
              )}
            >
              <span className="font-medium">{size.label}</span>
              <span className="font-bold tabular-nums">
                {formatPrice(size.price)}
              </span>
            </button>
          );
        })}
      </div>
      <Button
        variant="primary"
        className="mt-3 w-full font-bold"
        disabled={!chosen}
        onClick={() => chosen && onSelect(chosen)}
      >
        {labels.addToCart}
      </Button>
    </>
  );

  if (mode === "popover") {
    return (
      <Popover.Root
        open
        onOpenChange={(open) => {
          if (!open) onOpenChange(false);
        }}
      >
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchor}
            side="top"
            align="start"
            sideOffset={8}
            className="z-50"
          >
            <Popover.Popup className="w-64 rounded-card border border-[var(--color-border)] bg-[var(--bg-primary)] p-3 text-caption shadow-lifted">
              {panel(true)}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-card px-4 pb-6">
        <SheetHeader className="px-0 pt-0">
          <SheetTitle className="text-body font-bold">
            {labels.chooseSize}
          </SheetTitle>
        </SheetHeader>
        {panel(false)}
      </SheetContent>
    </Sheet>
  );
}
