import type { Order } from "@/types/order";
import { formatPrice } from "@/lib/currency";

/**
 * Build a concise Arabic WhatsApp message for a new order notification.
 * Keeps the message short to fit within WhatsApp/URL length limits.
 */
function buildOrderWhatsAppMessage(order: Order): string {
  const lines: string[] = [];

  lines.push("🛒 طلب جديد — Parfums De Foda");
  lines.push(`رقم الطلب: ${order.orderNumber}`);
  lines.push(`العميل: ${order.customer.name}`);
  lines.push(`الهاتف: ${order.customer.phone}`);
  lines.push(`العنوان: ${order.customer.address}`);
  lines.push("المنتجات:");

  const MAX_ITEMS = 5;
  const displayItems = order.items.slice(0, MAX_ITEMS);
  for (const item of displayItems) {
    const itemTotal = item.price * item.quantity;
    lines.push(`• ${item.name} — ${item.sizeLabel} × ${item.quantity} = ${formatPrice(itemTotal)}`);
  }

  if (order.items.length > MAX_ITEMS) {
    lines.push(`... + ${order.items.length - MAX_ITEMS} منتج إضافي`);
  }

  lines.push(`المجموع: ${formatPrice(order.total)}`);

  return lines.join("\n");
}

/**
 * Send a new order notification via WhatsApp using the CallMeBot API.
 *
 * Required environment variables:
 *   CALLMEBOT_PHONE    — owner's WhatsApp number in international format (e.g. 201117569506)
 *   CALLMEBOT_API_KEY  — CallMeBot API key
 *
 * @throws {Error} if CALLMEBOT_PHONE or CALLMEBOT_API_KEY is missing,
 *   or if the CallMeBot API returns a non-200 response
 */
export async function sendOrderWhatsApp(order: Order): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE;
  if (!phone) {
    throw new Error("CALLMEBOT_PHONE environment variable is not set");
  }

  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) {
    throw new Error("CALLMEBOT_API_KEY environment variable is not set");
  }

  const text = buildOrderWhatsAppMessage(order);

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `CallMeBot API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
    );
  }
}
