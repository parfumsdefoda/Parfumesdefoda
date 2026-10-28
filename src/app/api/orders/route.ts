import { NextResponse } from "next/server";
import { loadProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { orderRequestSchema } from "@/schemas/order";
import { resolveOrderItems } from "@/lib/order-pricing";
import { generateOrderNumber } from "@/lib/order-number";
import { getShippingFee } from "@/lib/shipping";
import { logOrderCreated, logOrderError } from "@/lib/logger";
import { sendOrderEmail } from "@/lib/email";
import { sendOrderWhatsApp } from "@/lib/whatsapp";
import { incrementProductSales } from "@/lib/sales-tracking";
import { checkOrderRateLimit } from "@/lib/rate-limiter";
import { isSameOriginRequest } from "@/lib/request-origin";
import { saveOrder } from "@/lib/order-store";
import {
  ALL_CHANNELS_FAILED_MESSAGE,
  isOrderAccepted,
  withTimeout,
  type DeliveryOutcome,
} from "@/lib/order-delivery";
import type { Order } from "@/types/order";

/**
 * POST /api/orders — create an order.
 *
 * Trust model: the request only names WHAT the customer wants (productId +
 * sizeLabel + quantity) plus their contact details. Everything about money is
 * recomputed here from data/products.json and data/settings.json, so a tampered
 * client can neither change a price nor invent a shipping fee.
 *
 * Hardening:
 * - shared Zod schema with the checkout form (incl. the Egyptian phone regex)
 * - cross-site requests rejected (Origin/Host mismatch)
 * - 5 orders / 10 minutes per IP (Upstash sliding window, in-memory fallback)
 * - order number minted on the server
 * - no order data kept in memory, and no customer PII in logs
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAYMENT_METHOD = "الدفع عند الاستلام";

/** Persistence is an optional add-on: give it 2s, then move on. */
const ORDER_STORE_TIMEOUT_MS = 2_000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  return candidate || "unknown";
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    null;

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "طلب غير مصرح به" },
      { status: 403 },
    );
  }

  const rateLimit = await checkOrderRateLimit(getClientIp(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "وصلت للحد الأقصى من الطلبات. جرّب تاني بعد شوية أو تواصل معانا على واتساب.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "بيانات الطلب غير صالحة" },
      { status: 400 },
    );
  }

  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات الطلب غير مكتملة" },
      { status: 400 },
    );
  }

  try {
    const [products, settings] = await Promise.all([
      loadProducts(),
      loadFullSettings(),
    ]);

    const resolved = resolveOrderItems(products, parsed.data.items);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    const subtotal = resolved.subtotal;
    const shippingCost = getShippingFee(settings);
    const total = subtotal + shippingCost;

    const order: Order = {
      orderNumber: await generateOrderNumber(),
      customer: parsed.data.customer,
      items: resolved.items,
      subtotal,
      shippingCost,
      total,
      paymentMethod: parsed.data.paymentMethod ?? DEFAULT_PAYMENT_METHOD,
      createdAt: new Date().toISOString(),
    };

    // Structured production log — no customer PII.
    logOrderCreated(
      {
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
        total: order.total,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      },
      { requestId },
    );

    // Deliver to the owner. Each channel is independent: one failing never
    // blocks the others, and none of them sets the HTTP status on its own.
    const delivery: DeliveryOutcome = {
      email: false,
      whatsapp: false,
      store: false,
    };

    try {
      await sendOrderEmail(order);
      delivery.email = true;
    } catch {
      console.error("[email] Order notification delivery failed.");
    }

    try {
      await sendOrderWhatsApp(order);
      delivery.whatsapp = true;
    } catch {
      console.error("[whatsapp] Order notification delivery failed.");
    }

    // Optional persistence — bounded and failure-tolerant.
    const stored = await withTimeout(
      saveOrder(order).catch(() => ({ ok: false })),
      ORDER_STORE_TIMEOUT_MS,
      { ok: false },
    );
    delivery.store = stored.ok;

    console.log(
      `[orders] ${order.orderNumber} delivery: email=${delivery.email} whatsapp=${delivery.whatsapp} store=${delivery.store}`,
    );

    if (!isOrderAccepted(delivery)) {
      // Production, and no channel took the order: keep the cart, let them retry.
      console.error(
        `[orders] ${order.orderNumber} reached no delivery channel`,
      );
      return NextResponse.json(
        { error: ALL_CHANNELS_FAILED_MESSAGE },
        { status: 503 },
      );
    }

    // Rank products by sales (non-blocking; never throws).
    try {
      await incrementProductSales(order.items);
    } catch {
      console.error("[sales-tracking] Product sales update failed.");
    }

    return NextResponse.json(
      {
        success: true,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        message: "تم استلام الطلب بنجاح",
      },
      { status: 201 },
    );
  } catch (error) {
    logOrderError(error, { requestId });

    return NextResponse.json(
      { error: "خطأ في معالجة الطلب" },
      { status: 500 },
    );
  }
}
