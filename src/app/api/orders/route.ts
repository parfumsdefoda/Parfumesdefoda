import { NextResponse } from "next/server";
import { logOrderCreated, logOrderError } from "@/lib/logger";
import { sendOrderEmail } from "@/lib/email";
import { sendOrderWhatsApp } from "@/lib/whatsapp";
import { incrementProductSales } from "@/lib/sales-tracking";

/**
 * Order item received from the checkout form.
 */
interface OrderItem {
  productId: string;
  name: string;
  sizeLabel: string;
  quantity: number;
  price: number;
  image: string;
}

/**
 * Order object submitted from the checkout page.
 */
interface Order {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    governorate: string;
    city: string;
    addressDetails: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

/**
 * POST /api/orders
 *
 * Receives a new order from the checkout page.
 * Currently stores the order in-memory (array).
 * In production, this would save to a database and trigger
     * email notifications to the store owner (see sendOrderEmail).
   */
const orders: Order[] = [];

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") || request.headers.get("x-request-id") || null;

  try {
    const order: Order = await request.json();

    // Validate required fields
    if (!order.orderNumber || !order.customer || !order.items || order.items.length === 0) {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة" },
        { status: 400 },
      );
    }

    // Validate customer data
    if (!order.customer.name || !order.customer.phone || !order.customer.governorate || !order.customer.city || !order.customer.addressDetails) {
      return NextResponse.json(
        { error: "بيانات العميل غير مكتملة" },
        { status: 400 },
      );
    }

    // Store order
    orders.push(order);

    // Structured production log
    logOrderCreated(order, { requestId });

    // Send order notification email to store owner (non-blocking)
    try {
      await sendOrderEmail(order);
    } catch (emailError) {
      console.error(
        "[email] Failed to send order notification email:",
        emailError instanceof Error ? emailError.message : String(emailError),
      );
    }

    // Send order notification via WhatsApp to store owner (non-blocking)
    try {
      await sendOrderWhatsApp(order);
    } catch (whatsAppError) {
      console.error(
        "[whatsapp] Failed to send order notification WhatsApp:",
        whatsAppError instanceof Error ? whatsAppError.message : String(whatsAppError),
      );
    }

    // Track product sales in Redis (non-blocking)
    // incrementProductSales never throws (failures are logged internally),
    // so this can never block or fail the customer's success response.
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

/**
 * GET /api/orders
 *
 * Returns all orders (for admin use in the future).
 */
export async function GET() {
  return NextResponse.json({
    orders,
    count: orders.length,
  });
}
