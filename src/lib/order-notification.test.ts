import { describe, expect, it } from "vitest";
import { formatOrderNotification } from "./order-notification";
import type { Order } from "@/types/order";

const order: Order = {
  orderNumber: "PDF-20261028-00123",
  customer: {
    name: "أحمد <محمد>",
    phone: "01012345678",
    whatsapp: "01198765432",
    governorate: "القاهرة",
    city: "مدينة نصر",
    addressDetails: "شارع طويل جداً، عمارة ١٢، الدور الثالث، بجوار معلم معروف جداً يمتد وصفه إلى أكثر من سطر للتأكد من بقاء العنوان كاملاً",
    notes: "يرجى الاتصال قبل الوصول",
  },
  items: Array.from({ length: 7 }, (_, index) => ({
    productId: `PF00${index + 1}`,
    name: `عطر رقم ${index + 1}`,
    sizeLabel: index % 2 ? "30 مل" : "50 مل",
    quantity: index + 1,
    price: 500 + index * 100,
    image: `/products/pf00${index + 1}.png`,
  })),
  subtotal: 23800,
  shippingCost: 100,
  total: 23900,
  paymentMethod: "الدفع عند الاستلام",
  createdAt: "2026-10-28T12:30:00.000Z",
};

describe("formatOrderNotification", () => {
  it("snapshots the full WhatsApp plain text including all lines and totals", () => {
    const { text } = formatOrderNotification(order);
    expect(text).toMatchSnapshot();
    expect(text).toContain("إجمالي السطر");
    expect(text).toContain("ملاحظات: يرجى الاتصال قبل الوصول");
    expect(text).toContain("العنوان الكامل");
    expect(text).not.toContain("منتج إضافي");
  });

  it("snapshots escaped RTL HTML with a complete item table", () => {
    const { html } = formatOrderNotification(order);
    expect(html).toMatchSnapshot();
    expect(html).toContain("أحمد &lt;محمد&gt;");
    expect(html).toContain("<table");
    expect(html).toContain("<bdi dir=\"ltr\">01012345678</bdi>");
  });
});
