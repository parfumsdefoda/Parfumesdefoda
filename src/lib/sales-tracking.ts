import { redis } from "./redis";

/**
 * Product-sales tracking on Upstash Redis.
 *
 * Server-only module (see src/lib/redis.ts for the client boundary rules).
 *
 * Sales counts are stored in a single Redis hash:
 *   key:    "product-sales"
 *   field:  productId (e.g. "PF010")
 *   value:  total quantity sold (incremented atomically via HINCRBY)
 *
 * Both helpers are deliberately failure-tolerant: they log errors and never
 * throw, so a Redis outage can never block order completion or page rendering.
 */

/** Key of the Redis hash that stores aggregate sales per product. */
const PRODUCT_SALES_KEY = "product-sales";

export interface ProductSalesItem {
  productId: string;
  quantity: number;
}

/**
 * Atomically increment the sales count for each product in an order.
 *
 * Each item's quantity is added to the product's hash field via HINCRBY.
 * Never throws — failures are logged and swallowed.
 */
export async function incrementProductSales(
  items: ProductSalesItem[],
): Promise<void> {
  try {
    for (const item of items) {
      const productId = item?.productId;
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
      await redis.hincrby(PRODUCT_SALES_KEY, productId, quantity);
    }
  } catch (error) {
    console.error(
      "[sales-tracking] Failed to increment product sales:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Fetch the full product-sales hash as a plain object.
 *
 * Returns `{ [productId]: quantitySold }`. On any failure (or when the hash
 * is empty) returns an empty object — callers fall back to default ordering.
 */
export async function getProductSalesCounts(): Promise<
  Record<string, number>
> {
  try {
    const raw = await redis.hgetall(PRODUCT_SALES_KEY);
    if (!raw) return {};

    const counts: Record<string, number> = {};
    for (const [productId, value] of Object.entries(raw)) {
      const num = Number(value);
      counts[productId] = Number.isFinite(num) ? num : 0;
    }
    return counts;
  } catch (error) {
    console.error(
      "[sales-tracking] Failed to fetch product sales counts:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}