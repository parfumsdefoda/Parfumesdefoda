import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "./order";

const validBody = {
  customer: {
    name: "أحمد محمد",
    phone: "01012345678",
    whatsapp: "01012345678",
    governorate: "القاهرة",
    city: "مدينة نصر",
    addressDetails: "شارع 9، مبنى 12، أمام المسجد",
  },
  items: [{ productId: "PF001", sizeLabel: "50 مللى", quantity: 2 }],
};

describe("orderRequestSchema", () => {
  it("accepts a valid order", () => {
    expect(orderRequestSchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts a +20 phone number", () => {
    const result = orderRequestSchema.safeParse({
      ...validBody,
      customer: { ...validBody.customer, phone: "+201012345678" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid Egyptian phone number", () => {
    const result = orderRequestSchema.safeParse({
      ...validBody,
      customer: { ...validBody.customer, phone: "12345" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty cart", () => {
    expect(
      orderRequestSchema.safeParse({ ...validBody, items: [] }).success,
    ).toBe(false);
  });

  it("rejects quantity 0, 21 and non-integers", () => {
    for (const quantity of [0, 21, 1.5, -3]) {
      const result = orderRequestSchema.safeParse({
        ...validBody,
        items: [{ productId: "PF001", sizeLabel: "50 مللى", quantity }],
      });
      expect(result.success, `quantity ${quantity}`).toBe(false);
    }
  });

  it("strips client-supplied prices and totals", () => {
    const result = orderRequestSchema.safeParse({
      ...validBody,
      items: [
        { productId: "PF001", sizeLabel: "50 مللى", quantity: 1, price: 1 },
      ],
      subtotal: 1,
      total: 1,
      shippingCost: 0,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("total");
    expect(result.data).not.toHaveProperty("subtotal");
    expect(result.data.items[0]).not.toHaveProperty("price");
  });
});
