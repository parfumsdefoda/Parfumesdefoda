import { MAX_ITEM_QUANTITY } from "@/schemas/order";
import { isComingSoon } from "./product-availability";

export interface CartLineRecord {
  productId: string;
  slug?: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  name: string;
  image: string;
}

export interface CartCatalogSize {
  label: string;
  price: number;
  inStock: boolean;
}

/** Minimal shopper-safe catalogue projection; deliberately excludes house and other private fields. */
export interface CartCatalogProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  status: string;
  inStock: boolean;
  sizes: CartCatalogSize[];
  hidden?: boolean;
}

export type CartLineIssue =
  | "product-unavailable"
  | "size-unavailable"
  | "price-changed"
  | "invalid-quantity";

export interface ResolvedCartLine {
  item: CartLineRecord;
  product?: CartCatalogProduct;
  size?: CartCatalogSize;
  issue: CartLineIssue | null;
}

export function resolveCartLine(
  item: CartLineRecord,
  products: readonly CartCatalogProduct[],
): ResolvedCartLine {
  const product = products.find((candidate) => candidate.id === item.productId);
  if (!product || product.hidden || product.status !== "active" || !product.inStock || isComingSoon(product)) {
    return { item, product, issue: "product-unavailable" };
  }

  const size = product.sizes.find((candidate) => candidate.label === item.sizeLabel);
  if (!size || !size.inStock) return { item, product, size, issue: "size-unavailable" };
  if (item.price !== size.price) return { item, product, size, issue: "price-changed" };
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
    return { item, product, size, issue: "invalid-quantity" };
  }

  return { item, product, size, issue: null };
}

export function resolveCartLines(
  items: readonly CartLineRecord[],
  products: readonly CartCatalogProduct[],
): ResolvedCartLine[] {
  return items.map((item) => resolveCartLine(item, products));
}

export function getCartTotals(
  lines: readonly ResolvedCartLine[],
  shippingFee: number,
): { subtotal: number; shipping: number; total: number } {
  const subtotal = lines.reduce(
    (sum, line) => sum + (line.size?.price ?? line.item.price) * line.item.quantity,
    0,
  );
  const shipping = Number.isFinite(shippingFee) && shippingFee >= 0 ? shippingFee : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

export function isCartCheckoutBlocked(lines: readonly ResolvedCartLine[]): boolean {
  return lines.some((line) => line.issue !== null);
}

export function clampCartQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.trunc(quantity)));
}
