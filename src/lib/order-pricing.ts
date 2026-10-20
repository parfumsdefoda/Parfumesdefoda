import type { Product } from "@/types";
import { MAX_ITEM_QUANTITY, type OrderLineRequest } from "@/schemas/order";

/**
 * Server-side order pricing.
 *
 * Every line is re-resolved from the catalog: the client never sends a price,
 * and a line the customer can no longer buy (unknown product, unknown size,
 * out of stock, quantity out of range) rejects the whole order instead of
 * silently charging something else.
 */

export interface PricedOrderItem {
  productId: string;
  name: string;
  sizeLabel: string;
  quantity: number;
  price: number;
  image: string;
}

export type ResolveOrderItemsResult =
  | { ok: true; items: PricedOrderItem[]; subtotal: number }
  | { ok: false; error: string };

const MSG_UNKNOWN_PRODUCT =
  "أحد المنتجات في سلتك لم يعد متوفراً في المتجر. يرجى تحديث السلة والمحاولة مرة أخرى.";
const MSG_UNKNOWN_SIZE =
  "أحد الأحجام المختارة لم يعد متوفراً. يرجى اختيار حجم آخر من صفحة المنتج.";
const MSG_OUT_OF_STOCK =
  "أحد المنتجات في سلتك غير متوفر حالياً. يرجى تحديث السلة والمحاولة مرة أخرى.";
const MSG_INVALID_QUANTITY = "الكمية المطلوبة غير صحيحة. الحد الأقصى ٢٠ قطعة لكل منتج.";

/**
 * Resolve requested lines against the catalog and compute the subtotal.
 * Line prices always come from `products.json`, never from the request.
 */
export function resolveOrderItems(
  products: Product[],
  lines: OrderLineRequest[],
): ResolveOrderItemsResult {
  if (lines.length === 0) {
    return { ok: false, error: "سلة التسوق فارغة." };
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  // Merge duplicate lines (same product + size) before pricing so a crafted
  // request cannot bypass the per-line quantity ceiling.
  const merged = new Map<string, PricedOrderItem>();

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) {
      return { ok: false, error: MSG_UNKNOWN_PRODUCT };
    }
    if (product.inStock === false) {
      return { ok: false, error: MSG_OUT_OF_STOCK };
    }

    const size = product.sizes.find((s) => s.label === line.sizeLabel);
    if (!size) {
      return { ok: false, error: MSG_UNKNOWN_SIZE };
    }
    if (size.inStock === false) {
      return { ok: false, error: MSG_OUT_OF_STOCK };
    }

    const key = `${product.id}::${size.label}`;
    const existing = merged.get(key);
    const quantity = (existing?.quantity ?? 0) + line.quantity;

    if (quantity > MAX_ITEM_QUANTITY) {
      return { ok: false, error: MSG_INVALID_QUANTITY };
    }

    merged.set(key, {
      productId: product.id,
      name: product.name,
      sizeLabel: size.label,
      quantity,
      price: size.price,
      image: product.image,
    });
  }

  const items = [...merged.values()];
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return { ok: true, items, subtotal };
}
