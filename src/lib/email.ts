import type { CartItem } from "@/providers/CartProvider";
import type { CheckoutFormData } from "@/schemas/checkout";

/**
 * Generate an email order message.
 *
 * Constructs a mailto link with a pre-formatted order message
 * containing order number, all cart items, and customer details.
 */
export function generateEmailUrl(
  email: string,
  items: CartItem[],
  customer: CheckoutFormData,
  total: number,
  orderNumber?: string,
): string {
  const subject = orderNumber
    ? `طلب جديد ${orderNumber} — Parfums De Foda`
    : "طلب جديد من Parfums De Foda";
  const body = buildEmailBody(items, customer, total, orderNumber);
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildEmailBody(
  items: CartItem[],
  customer: CheckoutFormData,
  total: number,
  orderNumber?: string,
): string {
  const lines = [
    orderNumber ? `طلب جديد رقم ${orderNumber}` : "طلب جديد",
    "",
    "المنتجات:",
    ...items.map(
      (item) => `- ${item.name} (${item.sizeLabel}) × ${item.quantity} = ${(item.price * item.quantity).toLocaleString("ar-EG")} ج.م`,
    ),
    "",
    `المجموع: ${total.toLocaleString("ar-EG")} ج.م`,
    "",
    "---",
  ];

  if (orderNumber) {
    lines.push(`رقم الطلب: ${orderNumber}`);
  }

  lines.push(
    "",
    "بيانات العميل:",
    `الاسم: ${customer.name}`,
    `رقم الهاتف: ${customer.phone}`,
    `العنوان: ${customer.address}`,
  );

  return lines.join("\n");
}
