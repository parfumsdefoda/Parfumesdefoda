"use client";

import { Minus, Plus, Trash2, Truck } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatNumber, formatPrice, formatSizeLabel } from "@/lib/currency";
import { MAX_ITEM_QUANTITY } from "@/schemas/order";
import type { ResolvedCartLine } from "@/lib/cart-utils";

export interface CartLineLabels {
  quantity: string;
  remove: string;
  issues: {
    "product-unavailable": string;
    "size-unavailable": string;
    "price-changed": string;
    "invalid-quantity": string;
  };
}

export function CartLine({
  line,
  labels,
  onUpdateQuantity,
  onRemove,
  className = "",
}: {
  line: ResolvedCartLine;
  labels: CartLineLabels;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  className?: string;
}) {
  const { item, product, size, issue } = line;
  const displayName = product?.name ?? item.name;
  const displayImage = product?.image ?? item.image;
  const displaySlug = product?.slug ?? item.slug;
  const price = size?.price ?? item.price;

  return (
    <div className={`flex gap-3 py-4 ${className}`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-control bg-[var(--color-surface-muted)]">
        <ProductImage
          slug={displaySlug}
          src={displayImage}
          name={displayName}
          tier="card"
          frame="thumb"
          sizes="64px"
          className="p-1"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-caption font-medium text-[var(--color-text)]">{displayName}</h3>
        <p className="text-caption text-[var(--color-text-muted)]">{formatSizeLabel(item.sizeLabel)}</p>
        <p className="text-caption text-[var(--color-text-muted)]">سعر الوحدة: {formatPrice(price)}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${labels.quantity}: ${formatNumber(item.quantity - 1)}`}
              disabled={item.quantity <= 1}
              onClick={() => onUpdateQuantity(item.quantity - 1)}
            >
              <Minus aria-hidden="true" className="h-3 w-3" />
            </Button>
            <span aria-live="polite" className="min-w-6 text-center text-caption font-bold tabular-nums">
              {formatNumber(item.quantity)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${labels.quantity}: ${formatNumber(item.quantity + 1)}`}
              disabled={item.quantity >= MAX_ITEM_QUANTITY}
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus aria-hidden="true" className="h-3 w-3" />
            </Button>
          </div>
          <span className="ms-auto shrink-0 whitespace-nowrap text-caption font-bold tabular-nums">
            {formatPrice(price * item.quantity)}
          </span>
        </div>
        {issue && (
          <p role="alert" className="mt-2 rounded-control border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-2.5 py-2 text-caption text-[var(--color-danger)]">
            {labels.issues[issue]}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={labels.remove}
        className="self-start text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function CartTotals({
  subtotal,
  shipping,
  labels,
}: {
  subtotal: number;
  shipping: number;
  labels: { subtotal: string; shipping: string; total: string };
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-caption">
        <span className="text-[var(--color-text-muted)]">{labels.subtotal}</span>
        <span className="whitespace-nowrap tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-caption">
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <Truck aria-hidden="true" className="h-3.5 w-3.5" />
          {labels.shipping}
        </span>
        <span className="whitespace-nowrap tabular-nums">{formatPrice(shipping)}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-bold text-[var(--color-text)]">{labels.total}</span>
        <span className="whitespace-nowrap text-title-3 font-bold text-[var(--color-brand)] tabular-nums">
          {formatPrice(subtotal + shipping)}
        </span>
      </div>
    </div>
  );
}
