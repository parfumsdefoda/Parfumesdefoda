import type { CartItem } from "@/providers/CartProvider";
import type { CheckoutFormData } from "@/schemas/checkout";
import { formatPrice } from "@/lib/currency";
import { Resend } from "resend";

/**
 * Order data for email notification.
 * The customer.notes field is optional — included if provided.
 */
export interface OrderEmailData {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: {
    productId: string;
    name: string;
    sizeLabel: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

/**
 * Escape HTML special characters to prevent injection in email templates.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * Format a date string in Arabic (locale: ar-EG).
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return dateString;
  }
}

/**
 * Build the HTML email body for new order notifications.
 * Fully RTL (dir="rtl"), Arabic, and mobile-friendly.
 */
function buildOrderEmailHtml(data: OrderEmailData): string {
  const { customer } = data;
  const notes = customer.notes?.trim() ?? "";
  const formattedDate = formatDate(data.createdAt);
  const year = new Date().getFullYear();

  const itemsRows = data.items
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align: right; font-size: 14px;">${escapeHtml(item.name)}</td>
          <td style="padding: 8px; text-align: right; font-size: 14px;">${escapeHtml(item.sizeLabel)}</td>
          <td style="padding: 8px; text-align: center; font-size: 14px;">${item.quantity}</td>
          <td style="padding: 8px; text-align: right; font-size: 14px;">${formatPrice(item.price)}</td>
          <td style="padding: 8px; text-align: right; font-size: 14px; font-weight: 600;">${formatPrice(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طلب جديد ${escapeHtml(data.orderNumber)} — Parfums De Foda</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: system-ui, -apple-system, sans-serif; color: #374151;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="color: #632989; font-size: 24px; margin: 0 0 4px;">Parfums De Foda</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">طلب جديد</p>
    </div>

    <!-- Order Info -->
    <div style="margin-bottom: 24px;">
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">رقم الطلب:</strong> <span style="font-family: monospace; direction: ltr; display: inline-block; font-size: 14px;">${escapeHtml(data.orderNumber)}</span></p>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">التاريخ:</strong> ${formattedDate}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">طريقة الدفع:</strong> ${escapeHtml(data.paymentMethod)}</p>
    </div>

    <!-- Customer Info -->
    <div style="margin-bottom: 24px;">
      <h2 style="color: #374151; font-size: 18px; margin: 0 0 12px; padding-right: 8px; border-right: 3px solid #9cd676;">بيانات العميل</h2>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">الاسم:</strong> ${escapeHtml(customer.name)}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">رقم الهاتف:</strong> ${escapeHtml(customer.phone)}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">العنوان:</strong> ${escapeHtml(customer.address)}</p>
      ${notes
        ? `<p style="margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">ملاحظات:</strong> ${escapeHtml(notes)}</p>`
        : `<p style="margin: 4px 0; font-size: 14px; color: #9ca3af;"><strong>ملاحظات:</strong> لا توجد</p>`
      }
    </div>

    <!-- Items Table -->
    <div style="margin-bottom: 24px;">
      <h2 style="color: #374151; font-size: 18px; margin: 0 0 12px; padding-right: 8px; border-right: 3px solid #9cd676;">المنتجات</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; text-align: right; color: #374151;">المنتج</th>
            <th style="padding: 8px; text-align: right; color: #374151;">الحجم</th>
            <th style="padding: 8px; text-align: center; color: #374151;">الكمية</th>
            <th style="padding: 8px; text-align: right; color: #374151;">السعر</th>
            <th style="padding: 8px; text-align: right; color: #374151;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
        <span style="color: #6b7280;">المجموع الفرعي</span>
        <strong style="color: #374151;">${formatPrice(data.subtotal)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
        <span style="color: #6b7280;">الشحن</span>
        <strong style="color: #374151;">${data.shippingCost > 0 ? formatPrice(data.shippingCost) : "مجاناً"}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; border-top: 2px solid #e5e7eb;">
        <strong style="color: #632989;">الإجمالي</strong>
        <strong style="color: #632989;">${formatPrice(data.total)}</strong>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
      <p style="margin: 4px 0;">© ${year} Parfums De Foda — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a new order notification email to the store owner.
 * Uses the Resend API.
 *
 * Required environment variables:
 *   RESEND_API_KEY  — Resend API key (secret, server-side only)
 *   OWNER_EMAIL     — recipient address (store owner email)
 *
 * Optional environment variables:
 *   RESEND_FROM_EMAIL — sender email (defaults to 'onboarding@resend.dev')
 *
 * @throws {Error} if RESEND_API_KEY or OWNER_EMAIL is missing, or if email delivery fails
 */
export async function sendOrderEmail(data: OrderEmailData): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL environment variable is not set");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const html = buildOrderEmailHtml(data);

  await resend.emails.send({
    from: fromEmail,
    to: ownerEmail,
    subject: `طلب جديد ${data.orderNumber} — Parfums De Foda`,
    html,
  });
}

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
