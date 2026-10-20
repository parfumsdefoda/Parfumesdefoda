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

    // Notify the store owner — never changes the customer's HTTP status.
    try {
      await sendOrderEmail(order);
    } catch (emailError) {
      console.error(
        "[email] Failed to send order notification email:",
        emailError instanceof Error ? emailError.message : String(emailError),
      );
    }

    try {
      await sendOrderWhatsApp(order);
    } catch (whatsAppError) {
      console.error(
        "[whatsapp] Failed to send order notification WhatsApp:",
        whatsAppError instanceof Error ? whatsAppError.message : String(whatsAppError),
      );
    }

    // Rank products by sales (non-blocking; never throws).
    try {
      await incrementProductSales(order.items);
    } catch (salesError) {
      console.error(
        "[sales-tracking] Failed to track product sales for order:",
        salesError instanceof Error ? salesError.message : String(salesError),
      );
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
