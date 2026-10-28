import type { Order } from "@/types/order";
import { isRedisConfigured, redis } from "./redis";

/**
 * OPTIONAL order persistence on Upstash Redis.
 *
 * Persistence is an add-on: email/WhatsApp are the real notification channels.
 * This module therefore NEVER throws and NEVER changes an HTTP status by
 * itself — it reports success/failure and the caller decides what to do.
 *
 * Keys:
 *   order:{orderNumber}  → JSON snapshot of the order
 *   orders:index         → list of order numbers (newest first)
 *
 * SERVER-ONLY (imports the Upstash client).
 */

const ORDER_INDEX_KEY = "orders:index";

export interface SaveOrderResult {
  ok: boolean;
}

export async function saveOrder(order: Order): Promise<SaveOrderResult> {
  if (!isRedisConfigured()) {
    // Silent no-op: the store simply is not configured on this deployment.
    return { ok: false };
  }

  try {
    await redis.set(`order:${order.orderNumber}`, JSON.stringify(order));
    await redis.lpush(ORDER_INDEX_KEY, order.orderNumber);
    return { ok: true };
  } catch {
    // Log the failure only — no PII, no raw order body.
    console.error("[order-store] Failed to persist order.");
    return { ok: false };
  }
}

/**
 * Read a stored order by number. Returns null when persistence is unavailable
 * or the order is unknown.
 */
export async function getStoredOrder(
  orderNumber: string,
): Promise<Order | null> {
  if (!isRedisConfigured()) return null;

  try {
    const raw = await redis.get<string | Order>(`order:${orderNumber}`);
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as Order) : raw;
  } catch {
    return null;
  }
}
