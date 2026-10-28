import { formatNumber, formatPrice, formatSizeLabel } from "@/lib/currency";
import type { Order } from "@/types/order";

export interface FormattedOrderNotification {
  text: string;
  html: string;
}

function formatOrderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

/** Build the owner-facing plain-text and HTML order notifications together. */
export function formatOrderNotification(order: Order): FormattedOrderNotification {
  const { customer } = order;
  const notes = customer.notes?.trim() || "لا توجد";
  const date = formatOrderDate(order.createdAt);
  const itemText = order.items.map((item, index) => [
    `${formatNumber(index + 1)}. ${item.name}`,
    `   الحجم: ${formatSizeLabel(item.sizeLabel)}`,
    `   الكمية: ${formatNumber(item.quantity)}`,
    `   سعر الوحدة: ${formatPrice(item.price)}`,
    `   إجمالي السطر: ${formatPrice(item.price * item.quantity)}`,
  ].join("\n"));

  const text = [
    "طلب جديد — Parfums De Foda",
    `رقم الطلب: ${order.orderNumber}`,
    `التاريخ والوقت (UTC): ${date}`,
    "",
    "بيانات العميل:",
    `الاسم: ${customer.name}`,
    `الهاتف: ${customer.phone}`,
    `واتساب: ${customer.whatsapp}`,
    `المحافظة: ${customer.governorate}`,
    `العنوان الكامل: ${customer.city}، ${customer.addressDetails}`,
    `ملاحظات: ${notes}`,
    "",
    "المنتجات:",
    ...itemText,
    "",
    `المجموع الفرعي: ${formatPrice(order.subtotal)}`,
    `الشحن: ${formatPrice(order.shippingCost)}`,
    `الإجمالي: ${formatPrice(order.total)}`,
    `طريقة الدفع: ${order.paymentMethod}`,
  ].join("\n");

  const rows = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(formatSizeLabel(item.sizeLabel))}</td>
      <td>${escapeHtml(formatNumber(item.quantity))}</td>
      <td>${escapeHtml(formatPrice(item.price))}</td>
      <td>${escapeHtml(formatPrice(item.price * item.quantity))}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>طلب جديد ${escapeHtml(order.orderNumber)}</title></head>
<body>
  <h1>طلب جديد — Parfums De Foda</h1>
  <p><strong>رقم الطلب:</strong> <bdi dir="ltr">${escapeHtml(order.orderNumber)}</bdi></p>
  <p><strong>التاريخ والوقت (UTC):</strong> ${escapeHtml(date)}</p>
  <h2>بيانات العميل</h2>
  <p><strong>الاسم:</strong> ${escapeHtml(customer.name)}</p>
  <p><strong>الهاتف:</strong> <bdi dir="ltr">${escapeHtml(customer.phone)}</bdi></p>
  <p><strong>واتساب:</strong> <bdi dir="ltr">${escapeHtml(customer.whatsapp)}</bdi></p>
  <p><strong>المحافظة:</strong> ${escapeHtml(customer.governorate)}</p>
  <p><strong>العنوان الكامل:</strong> ${escapeHtml(customer.city)}، ${escapeHtml(customer.addressDetails)}</p>
  <p><strong>ملاحظات:</strong> ${escapeHtml(notes)}</p>
  <h2>المنتجات</h2>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>المنتج</th><th>الحجم</th><th>الكمية</th><th>سعر الوحدة</th><th>إجمالي السطر</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p>المجموع الفرعي: <strong>${escapeHtml(formatPrice(order.subtotal))}</strong></p>
  <p>الشحن: <strong>${escapeHtml(formatPrice(order.shippingCost))}</strong></p>
  <p>الإجمالي: <strong>${escapeHtml(formatPrice(order.total))}</strong></p>
  <p>طريقة الدفع: ${escapeHtml(order.paymentMethod)}</p>
</body>
</html>`;

  return { text, html };
}
