import type { CartItem } from "@/providers/CartProvider";
import type { CheckoutFormData } from "@/schemas/checkout";

/**
 * Generate a WhatsApp order message URL.
 *
 * Constructs a wa.me link with a pre-formatted order message
 * containing order number, all cart items, and customer details.
 */
export function generateWhatsAppUrl(
  phone: string,
  items: CartItem[],
  customer: CheckoutFormData,
  total: number,
  orderNumber?: string,
): string {
  const phoneNumber = phone.replace(/[^0-9]/g, "");
  const message = buildOrderMessage(items, customer, total, orderNumber);
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function buildOrderMessage(
  items: CartItem[],
  customer: CheckoutFormData,
  total: number,
  orderNumber?: string,
): string {
  const lines = [
    orderNumber
      ? `مرحباً، هذا طلب جديد رقم ${orderNumber}:`
      : "مرحباً، أريد طلب المنتجات التالية:",
    "",
    ...items.map(
      (item) => `• ${item.name} (${item.sizeLabel}) × ${item.quantity} = ${(item.price * item.quantity).toLocaleString("ar-EG")} ج.م`,
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
    `الاسم: ${customer.name}`,
    `رقم الهاتف: ${customer.phone}`,
    `العنوان: ${customer.address}`,
  );

  return lines.join("\n");
}
