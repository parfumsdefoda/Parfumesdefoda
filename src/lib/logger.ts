import settings from "../../data/settings.json";

/**
 * Server-only structured logging helpers for order operations.
 *
 * These helpers output JSON to stdout/stderr so Vercel (and other platforms)
 * can capture and index the logs without leaking secrets.
 */

/**
 * Order log payload.
 *
 * Deliberately PII-free: logs are retained and indexed by the host, so the
 * customer's name, phone, WhatsApp and address never appear here. The order
 * number is enough to look the order up (and to correlate with the owner's
 * email/WhatsApp notification).
 */
export interface OrderLogInput {
  orderNumber: string;
  itemsCount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

interface LogOptions {
  requestId?: string | null;
}

function getRequestId(options?: LogOptions): string | null {
  return options?.requestId ?? null;
}

/**
 * Log a successfully created order.
 *
 * No customer PII: only the order number, item count and total. Never
 * passwords, tokens, cookies, authorization headers, or API keys.
 */
export function logOrderCreated(order: OrderLogInput, options?: LogOptions): void {
  const log = {
    event: "order.created",
    orderNumber: order.orderNumber,
    itemsCount: order.itemsCount,
    total: order.total,
    currency: settings.store.currency,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    environment: process.env.NODE_ENV ?? "unknown",
    requestId: getRequestId(options),
  };

  console.log(`📦 NEW ORDER CREATED\n${JSON.stringify(log, null, 2)}`);
}

/**
 * Log an order creation failure.
 *
 * Only the error message, optional stack, request id, and environment
 * are logged. No secrets or raw request bodies are included.
 */
export function logOrderError(error: unknown, options?: LogOptions): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;

  const log = {
    event: "order.error",
    level: "error",
    message,
    stack,
    environment: process.env.NODE_ENV ?? "unknown",
    requestId: getRequestId(options),
  };

  console.error(`❌ ORDER CREATION FAILED\n${JSON.stringify(log, null, 2)}`);
}

/**
 * Log an arbitrary server-side error (e.g. AI provider failures).
 *
 * Emits structured JSON to stderr so Vercel can index it. Includes the
 * error message/stack plus any safe extra context — never secrets.
 */
export function logError(
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;

  const log = {
    event,
    level: "error",
    message,
    stack,
    environment: process.env.NODE_ENV ?? "unknown",
    ...extra,
  };

  console.error(`❌ ${event.toUpperCase()} FAILED\n${JSON.stringify(log, null, 2)}`);
}
