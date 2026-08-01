import { NextResponse } from "next/server";
import { logOrderCreated, logOrderError } from "@/lib/logger";

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
    address: string;
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
 * email/WhatsApp notifications.
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
    if (!order.customer.name || !order.customer.phone || !order.customer.address) {
      return NextResponse.json(
        { error: "بيانات العميل غير مكتملة" },
        { status: 400 },
      );
    }

    // Store order
    orders.push(order);

    // Structured production log
    logOrderCreated(order, { requestId });

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
