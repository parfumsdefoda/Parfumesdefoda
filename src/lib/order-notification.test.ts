import { describe, expect, it } from "vitest";
import { formatOrderNotification } from "./order-notification";
import { resolveOrderItems } from "./order-pricing";
import { formatPrice, formatSizeLabel } from "./currency";
import type { Order } from "@/types/order";
import type { Product } from "@/types";

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

  /**
   * Refresh 5: a mixed cart of the two new single-size products (pf920 is an
   * oil sold only in 12 مل, pf940 only in 50 مل) plus a regular multi-size
   * product. Built from the real catalogue, so an owner-side price or size
   * change lands here instead of passing on a stale fixture.
   */
  it("keeps a mixed single-size cart readable, with four-digit prices in Arabic digits", async () => {
    const { default: catalogue } = await import("../../data/products.json");
    const visible = (catalogue as Product[]).filter((product) => !product.hidden);
    const inStock = (product: Product) => product.sizes.filter((size) => size.inStock);
    const singleOil = visible.find((product) => product.oily && inStock(product).length === 1);
    const singlePerfume = visible.find(
      (product) => !product.oily && inStock(product).length === 1,
    );
    const multi = visible.find((product) => inStock(product).length > 1);
    expect(Boolean(singleOil && singlePerfume && multi)).toBe(true);
    if (!singleOil || !singlePerfume || !multi) return;

    const lines = [singleOil, singlePerfume, multi].map((product) => ({
      productId: product.id,
      sizeLabel: inStock(product)[0].label,
      quantity: 1,
    }));
    const priced = resolveOrderItems(visible, lines);
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;

    const mixed: Order = {
      ...order,
      items: priced.items,
      subtotal: priced.subtotal,
      total: priced.subtotal + order.shippingCost,
    };
    const { text, html } = formatOrderNotification(mixed);
    expect(text).toMatchSnapshot();

    // Every line names its own size, and a four-digit price keeps its separator.
    for (const item of mixed.items) {
      expect(text).toContain(formatSizeLabel(item.sizeLabel));
    }
    expect(text).toContain(formatPrice(inStock(singleOil)[0].price));
    expect(text).toMatch(/[٠-٩]٬[٠-٩]{3}/);
    expect(html.match(/<tr>/g)?.length).toBe(mixed.items.length + 1);
  });
});
