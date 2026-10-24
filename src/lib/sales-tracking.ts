import { isRedisConfigured, redis } from "./redis";

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
 * Reads happen during the homepage render, so they are treated as best-effort
 * decoration: they are skipped entirely when Redis is not configured, capped by
 * a short timeout when it is, and never throw. A sales count can cost a few
 * milliseconds — it must never cost the page.
 */

/** Key of the Redis hash that stores aggregate sales per product. */
const PRODUCT_SALES_KEY = "product-sales";

/**
 * Upper bound for a render-time read. The homepage orders by best-seller, which
 * is a nicety: after this long the page renders with the default order instead.
 */
export const SALES_READ_TIMEOUT_MS = 300;

export interface ProductSalesItem {
  productId: string;
  quantity: number;
}

/** The one Redis command this module needs, so tests can pass a fake. */
export interface SalesReader {
  hgetall(key: string): Promise<unknown>;
}

export interface ReadSalesOptions {
  /** Override the shared client (tests). */
  reader?: SalesReader;
  /** Override the env check (tests). */
  configured?: boolean;
  /** Override the timeout (tests). */
  timeoutMs?: number;
}

/**
 * Resolve with the promise's value, or with `fallback` after `ms` — whichever
 * comes first. A rejection also resolves with the fallback: callers never see
 * a hung or failed read.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
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
 * Read the product-sales hash as a plain object.
 *
 * - No Upstash credentials → returns `{}` without touching the network.
 * - Redis throws → `{}`, logged once by the caller's own error text.
 * - Redis hangs → `{}` after {@link SALES_READ_TIMEOUT_MS}.
 */
export async function readProductSalesCounts(
  options: ReadSalesOptions = {},
): Promise<Record<string, number>> {
  const configured = options.configured ?? isRedisConfigured();
  if (!configured) return {};

  const reader: SalesReader = options.reader ?? redis;

  try {
    const raw = await withTimeout(
      // `hgetall` can throw synchronously (bad URL) — normalise it to a rejection
      // so the timeout path handles both.
      Promise.resolve().then(() => reader.hgetall(PRODUCT_SALES_KEY)),
      options.timeoutMs ?? SALES_READ_TIMEOUT_MS,
      null,
    );
    if (!raw || typeof raw !== "object") return {};

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
