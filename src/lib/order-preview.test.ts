import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { writeOrderPreview } from "./order-preview";
import type { Order } from "@/types/order";

const PREVIEW_DIR = path.join(process.cwd(), ".tmp", "order-previews");

const order: Order = {
  orderNumber: "PDF-20261030-00042",
  customer: {
    name: "<script>alert(1)</script>",
    phone: "01012345678",
    whatsapp: "01012345678",
    governorate: "القاهرة",
    city: "مدينة نصر",
    addressDetails: "شارع 9 & مبنى 12",
    notes: "اتصل عند الوصول",
  },
  items: [
    {
      productId: "PF680",
      name: "عود الصفا والمروه",
      sizeLabel: "12 مل",
      quantity: 2,
      price: 850,
      image: "/products/PF680.png",
    },
  ],
  subtotal: 1700,
  shippingCost: 100,
  total: 1800,
  paymentMethod: "الدفع عند الاستلام",
  createdAt: "2026-10-30T09:00:00.000Z",
};

afterAll(async () => {
  await rm(path.join(process.cwd(), ".tmp"), { recursive: true, force: true });
});

describe("writeOrderPreview", () => {
  it("writes the WhatsApp text with the order facts", async () => {
    const { path: file } = await writeOrderPreview("whatsapp", order);
    const text = await readFile(file, "utf8");

    expect(file.startsWith(PREVIEW_DIR)).toBe(true);
    expect(file).toContain("PDF-20261030-00042");
    expect(text).toContain("عود الصفا والمروه");
    // Sizes and prices reach the owner in Arabic-Indic numerals.
    expect(text).toContain("١٢ مل");
    expect(text).toContain("١٬٧٠٠ ج.م");
    expect(text).toContain("الدفع عند الاستلام");
  });

  it("writes the HTML email with customer input escaped", async () => {
    const { path: file } = await writeOrderPreview("email", order);
    const html = await readFile(file, "utf8");

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("شارع 9 &amp; مبنى 12");
  });
});
