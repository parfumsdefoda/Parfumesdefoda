import type { Order } from "@/types/order";
import { formatPrice } from "@/lib/currency";

interface WhatsappRecipient {
  phone: string;
  apiKey: string;
}

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

  lines.push(`المجوع: ${formatPrice(order.total)}`);

  return lines.join("\n");
}

/**
 * Build the list of valid WhatsApp recipients from environment variables.
 *
 * Reads pairs:
 *   CALLMEBOT_PHONE_1  / CALLMEBOT_API_KEY_1
 *   CALLMEBOT_PHONE_2  / CALLMEBOT_API_KEY_2
 *
 * A pair is skipped (with a warning) if either the phone or apiKey is missing.
 *
 * @throws {Error} if no valid recipient pairs are found.
 */
function buildRecipients(): WhatsappRecipient[] {
  const recipients: WhatsappRecipient[] = [];

  for (let i = 1; i <= 2; i++) {
    const phone = process.env[`CALLMEBOT_PHONE_${i}`];
    const apiKey = process.env[`CALLMEBOT_API_KEY_${i}`];

    if (!phone || !apiKey) {
      if (phone || apiKey) {
        console.warn(
          `[whatsapp] CALLMEBOT recipient ${i} is incomplete — ` +
            `${phone ? "API key" : "phone"} missing, skipping.`,
        );
      }
      continue;
    }

    recipients.push({ phone, apiKey });
  }

  if (recipients.length === 0) {
    throw new Error(
      "No valid CallMeBot recipients configured — " +
        "set CALLMEBOT_PHONE_1 / CALLMEBOT_API_KEY_1 (and optionally the _2 pair).",
    );
  }

  return recipients;
}

/**
 * Send a WhatsApp message to a single recipient via the CallMeBot API.
 */
async function sendToRecipient(
  recipient: WhatsappRecipient,
  text: string,
): Promise<void> {
  const { phone, apiKey } = recipient;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `CallMeBot API error for ${phone}: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
    );
  }
}

/**
 * Send a new order notification via WhatsApp using the CallMeBot API.
 *
 * Sends the same message to all valid recipients configured via:
 *   CALLMEBOT_PHONE_1  / CALLMEBOT_API_KEY_1
 *   CALLMEBOT_PHONE_2  / CALLMEBOT_API_KEY_2
 *
 * Recipients with a missing phone or API key are skipped (with a warning).
 * Uses Promise.allSettled so a failure for one recipient does not prevent
 * delivery to the others.
 *
 * @throws {Error} if no valid recipients are configured, or if ALL recipients fail.
 */
export async function sendOrderWhatsApp(order: Order): Promise<void> {
  const recipients = buildRecipients();
  const text = buildOrderWhatsAppMessage(order);

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendToRecipient(recipient, text).then(() => ({ phone: recipient.phone })),
    ),
  );

  const successes: string[] = [];
  const failures: { phone: string; reason: string }[] = [];

  results.forEach((result, index) => {
    const phone = recipients[index].phone;
    if (result.status === "fulfilled") {
      successes.push(phone);
    } else {
      failures.push({
        phone,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  for (const phone of successes) {
    console.log(`[whatsapp] Order notification sent to ${phone}.`);
  }

  for (const { phone, reason } of failures) {
    console.error(`[whatsapp] Failed to send to ${phone}: ${reason}`);
  }

  if (failures.length === recipients.length) {
    throw new Error(
      `All ${recipients.length} WhatsApp recipient(s) failed. Last error: ${failures[failures.length - 1]?.reason}`,
    );
  }
}
