/**
 * Card presentation — the product card's decisions as pure data.
 *
 * The card itself is a Server Component, so every branch it renders is decided
 * here, where it can be unit-tested without a DOM. Nothing in this module
 * invents a fact: a badge exists only when the catalogue says so, and a price
 * only when a size carries one.
 */

import type { Product } from "@/types";
import type { ProductForm } from "./product-vocabulary";
import { concentrationLabel, publicTierLabel } from "./product-labels";
import { isComingSoon, isUnavailableProduct } from "./product-availability";

/** The single badge a card may show. Priority: coming-soon > out-of-stock. */
export type CardBadge = "coming-soon" | "out-of-stock";

/** The word a premium variant carries in its own name. */
export const PREMIUM_NAME_MARK = "فاخر";

/** The word the premium frame adds to the meta line. */
export const PREMIUM_META_LABEL = "فاخر";

/**
 * True when the product name already says "فاخر".
 *
 * Premium variants are separate products named `تيروني (فاخر)`. The suffix is
 * INDEPENDENT of the frame: `isPremiumProduct` reads the owner's `is_featured`
 * flag, never the name, so renaming a product can never add or remove the ring.
 */
export function hasPremiumInName(name: string): boolean {
  return name.includes(PREMIUM_NAME_MARK);
}

/**
 * Premium (فاخر) — the owner's `is_featured` flag, and the only source of it.
 *
 * Premium is a FRAME, not a badge: the gold ring replaces the old gold pill, so
 * the same flag can style a card, a PDP stage and (later) any other surface.
 */
export function isPremiumProduct(product: Pick<Product, "featured">): boolean {
  return product.featured === true;
}

/** Separator used between the meta parts ("نيش · شرقي"). */
export const CARD_META_SEPARATOR = "·";

/** True when at least one size can be bought. */
export function hasAnyStock(product: Pick<Product, "sizes">): boolean {
  return product.sizes.some((size) => size.inStock);
}

/**
 * True when the product actually points at a file.
 *
 * A missing path renders the muted stage with no image at all — better than a
 * broken-image icon, and it keeps the card's geometry identical.
 */
export function hasProductImage(product: Pick<Product, "image">): boolean {
  return Boolean(product.image && product.image.trim() !== "");
}

/**
 * The one badge a card shows, or null.
 *
 * Normal in-stock products carry no badge at all — the restraint is the point.
 * A photo-less product outranks everything (it is not for sale), then an
 * unavailable product. Premium is not a badge any more — it is the gold frame,
 * so it never competes for this slot.
 */
export function cardBadge(
  product: Pick<Product, "image" | "inStock" | "status" | "sizes" | "name">,
): CardBadge | null {
  if (isComingSoon(product)) return "coming-soon";
  if (isUnavailableProduct(product) || !hasAnyStock(product)) return "out-of-stock";
  return null;
}

/**
 * Lowest price among the sizes a shopper can actually buy.
 *
 * Null when nothing is on sale. This is the number price filters and sorts
 * use: a sold-out product has no "starting price" to rank by.
 */
export function lowestBuyablePrice(product: Pick<Product, "sizes">): number | null {
  const inStock = product.sizes.filter((size) => size.inStock);
  if (inStock.length === 0) return null;
  return Math.min(...inStock.map((size) => size.price));
}

/**
 * The price the card prints: the cheapest buyable size, or — when the product
 * is sold out — the cheapest listed one, so the card states a price instead of
 * going blank.
 */
export function lowestInStockPrice(product: Pick<Product, "sizes">): number | null {
  if (product.sizes.length === 0) return null;
  const buyable = lowestBuyablePrice(product);
  if (buyable !== null) return buyable;
  return Math.min(...product.sizes.map((size) => size.price));
}

export interface CardPrice {
  /** "من" for a multi-size product, null for a single size. */
  prefix: string | null;
  amount: number;
}

/**
 * The price line: "من ١٢٠ ج.م" when the product has several sizes (the number
 * is the cheapest one on sale), "١٢٠ ج.م" when it has exactly one.
 */
export function cardPrice(product: Pick<Product, "sizes">, fromLabel = "من"): CardPrice | null {
  const amount = lowestInStockPrice(product);
  if (amount === null) return null;
  return {
    prefix: product.sizes.length > 1 ? fromLabel : null,
    amount,
  };
}

/**
 * The format a product is sold in.
 *
 * `is_oil` in the owner's master is the source of truth; the concentration is
 * only a fallback for an oil whose flag was never set.
 */
export function productForm(product: Pick<Product, "oily" | "concentration">): ProductForm {
  return product.oily || product.concentration === "oil" ? "زيت عطري" : "عطر";
}

/**
 * The meta line above the name: public tier · scent style · format.
 *
 * At most three parts, each present only when the catalogue has it. `دووب`
 * has no public label, so a dupe card simply starts with its scent style. An
 * oil shows "زيت عطري" instead of a concentration code, because the format is
 * the fact a shopper needs there.
 *
 * A premium product leads with the frame's word — "فاخر · نيش · شرقي" — and
 * drops the format, so the line stays at three parts.
 */
export function cardMetaParts(
  product: Pick<Product, "house" | "type" | "concentration" | "oily">,
  options: { premium?: boolean } = {},
): string[] {
  const parts: string[] = [];

  if (options.premium) parts.push(PREMIUM_META_LABEL);

  const tier = publicTierLabel(product.house);
  if (tier) parts.push(tier);

  if (product.type) parts.push(product.type);

  if (!options.premium) {
    const format = productForm(product);
    if (format === "زيت عطري") {
      parts.push(format);
    } else {
      const concentration = concentrationLabel(product.concentration);
      if (concentration) parts.push(concentration);
    }
  }

  return parts.slice(0, 3);
}

/** The meta line as one string, or null when there is nothing honest to say. */
export function cardMetaLine(
  product: Pick<Product, "house" | "type" | "concentration" | "oily">,
  options: { premium?: boolean } = {},
): string | null {
  const parts = cardMetaParts(product, options);
  return parts.length > 0 ? parts.join(` ${CARD_META_SEPARATOR} `) : null;
}

/** What the quick-add control should do for a product's sizes. */
export type QuickAddMode = "hidden" | "direct" | "chooser";

/**
 * One in-stock size → add it straight away; several → ask which one; none →
 * there is nothing to add, so the control does not render.
 */
export function quickAddMode(sizes: Pick<Product["sizes"][number], "inStock">[]): QuickAddMode {
  const available = sizes.filter((size) => size.inStock).length;
  if (available === 0) return "hidden";
  return available === 1 ? "direct" : "chooser";
}

/** Volume of a size label ("50 مل" → 50), without inventing one. */
export function sizeMlFromLabel(label: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)/.exec(label.trim());
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}
