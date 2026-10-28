import { formatOrderNotification } from "@/lib/order-notification";
import type { Order } from "@/types/order";
import { Resend } from "resend";

/** Send the shared order notification to the configured store owner email. */
export async function sendOrderEmail(order: Order): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) throw new Error("OWNER_EMAIL environment variable is not set");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set");

  const { html, text } = formatOrderNotification(order);
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: ownerEmail,
    subject: `طلب جديد ${order.orderNumber} — Parfums De Foda`,
    html,
    text,
  });
}
