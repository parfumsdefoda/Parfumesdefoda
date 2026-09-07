import settings from "../../data/settings.json";

/**
 * Server-only structured logging helpers for order operations.
 *
 * These helpers output JSON to stdout/stderr so Vercel (and other platforms)
 * can capture and index the logs without leaking secrets.
 */

export interface OrderLogInput {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    governorate: string;
    city: string;
    addressDetails: string;
  };
  items: {
    productId: string;
    name: string;
    sizeLabel: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  shippingCost: number;
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
 * Includes customer contact details (required for order tracking) but
 * never passwords, tokens, cookies, authorization headers, or API keys.
 */
export function logOrderCreated(order: OrderLogInput, options?: LogOptions): void {
  const log = {
    event: "order.created",
    orderNumber: order.orderNumber,
    customer: order.customer.name,
    phone: order.customer.phone,
    governorate: order.customer.governorate,
    city: order.customer.city,
    addressDetails: order.customer.addressDetails,
    total: order.total,
    currency: settings.store.currency,
    paymentMethod: order.paymentMethod,
    itemsCount: order.items.length,
    items: order.items.map((item) => ({
      id: item.productId,
      name: item.name,
      quantity: item.quantity,
      size: item.sizeLabel,
      price: item.price,
    })),
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
