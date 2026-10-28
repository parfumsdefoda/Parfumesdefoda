import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "./order";
import { normalizeEgyptianPhone } from "./checkout";

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

  it("normalizes every supported local and international phone format", () => {
    const variants = ["01012345678", "+201012345678", "00201012345678", "٠١٠١٢٣٤٥٦٧٨", "+٢٠١٠١٢٣٤٥٦٧٨"];
    for (const phone of variants) {
      const parsed = orderRequestSchema.safeParse({
        ...validBody,
        customer: { ...validBody.customer, phone, whatsapp: phone },
      });
      expect(parsed.success, phone).toBe(true);
      if (parsed.success) {
        expect(parsed.data.customer.phone).toBe("01012345678");
        expect(parsed.data.customer.whatsapp).toBe("01012345678");
      }
    }
  });

  it("normalizes accepted phone text on blur helper and rejects malformed input", () => {
    expect(normalizeEgyptianPhone("+20 10-1234-5678")).toBe("01012345678");
    for (const phone of ["12345", "02012345678", "+201312345678", "0101234567"]) {
      expect(orderRequestSchema.safeParse({
        ...validBody,
        customer: { ...validBody.customer, phone },
      }).success, phone).toBe(false);
    }
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
