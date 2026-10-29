import type { Order } from "@/types/order";
import { formatOrderNotification } from "@/lib/order-notification";
import { resolveOrderChannelMode } from "@/lib/order-channels";
import { writeOrderPreview } from "@/lib/order-preview";

interface WhatsappRecipient {
  phone: string;
  apiKey: string;
}

function buildOrderWhatsAppMessage(order: Order): string {
  return formatOrderNotification(order).text;
}

/** Build configured CallMeBot recipients without including their numbers in logs. */
function buildRecipients(): WhatsappRecipient[] {
  const recipients: WhatsappRecipient[] = [];

  for (let i = 1; i <= 2; i++) {
    const phone = process.env[`CALLMEBOT_PHONE_${i}`];
    const apiKey = process.env[`CALLMEBOT_API_KEY_${i}`];
    if (phone && apiKey) recipients.push({ phone, apiKey });
  }

  if (recipients.length === 0) {
    throw new Error("No valid CallMeBot recipients configured.");
  }
  return recipients;
}

async function sendToRecipient(recipient: WhatsappRecipient, text: string): Promise<void> {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(recipient.phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(recipient.apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CallMeBot API returned ${response.status} ${response.statusText}`);
  }
}

/** Send the same complete, formatted order to every configured recipient. */
export async function sendOrderWhatsApp(order: Order): Promise<void> {
  const mode = resolveOrderChannelMode();
  if (mode === "fail") throw new Error("WhatsApp delivery disabled by ORDER_CHANNELS_MODE=fail");
  if (mode === "log") {
    const preview = await writeOrderPreview("whatsapp", order);
    console.log(`[whatsapp] log mode: wrote ${preview.path}`);
    return;
  }

  const recipients = buildRecipients();
  const text = buildOrderWhatsAppMessage(order);
  const results = await Promise.allSettled(
    recipients.map((recipient) => sendToRecipient(recipient, text)),
  );

  const failures = results.filter((result) => result.status === "rejected");
  const successes = results.length - failures.length;
  if (successes > 0) {
    console.log(`[whatsapp] Order notification delivered to ${successes} recipient(s).`);
  }
  if (failures.length > 0) {
    console.error(`[whatsapp] Order notification failed for ${failures.length} recipient(s).`);
  }
  if (failures.length === recipients.length) {
    throw new Error(`All ${recipients.length} WhatsApp recipient(s) failed.`);
  }
}
