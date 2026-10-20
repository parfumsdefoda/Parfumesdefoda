import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";

const sendOrderEmail = vi.fn();
const sendOrderWhatsApp = vi.fn();
const saveOrder = vi.fn();
const incrementProductSales = vi.fn();

vi.mock("@/lib/email", () => ({
  sendOrderEmail: (...args: unknown[]) => sendOrderEmail(...args),
}));

vi.mock("@/lib/whatsapp", () => ({
  sendOrderWhatsApp: (...args: unknown[]) => sendOrderWhatsApp(...args),
}));

vi.mock("@/lib/order-store", () => ({
  saveOrder: (...args: unknown[]) => saveOrder(...args),
}));

vi.mock("@/lib/sales-tracking", () => ({
  incrementProductSales: (...args: unknown[]) => incrementProductSales(...args),
}));

vi.mock("@/lib/order-number", () => ({
  generateOrderNumber: async () => "PDF-20261020-00001",
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkOrderRateLimit: async () => ({
    allowed: true,
    remaining: 4,
    retryAfterMs: 0,
  }),
}));

const product: Product = {
  id: "PF020",
  sku: "0020",
  slug: "pf020",
  name: "عطر تجريبي",
  brand: "Parfums De Foda",
  description: "وصف",
  image: "/products/pf020.png",
  gallery: [],
  gender: "للجنسين",
  type: "شرقي",
  house: "نيش",
  oily: false,
  fodaOriginal: true,
  season: "شتوي",
  performance: "أداء قوي",
  featured: false,
  badge: "",
  rating: 0,
  reviews: 0,
  status: "active",
  sortOrder: 1,
  sizes: [{ label: "50 مل", price: 500, inStock: true }],
  inStock: true,
  notes: { top: [], middle: [], base: [] },
  seo: { title: "", description: "" },
};

vi.mock("@/services/products", () => ({
  loadProducts: async () => [product],
}));

vi.mock("@/services/settings", () => ({
  loadFullSettings: async () => ({
    store: {
      name: "Parfums De Foda",
      website: "https://parfumsdefoda.com",
      currency: "EGP",
      language: "ar",
      direction: "rtl",
    },
    grid: { desktop: 3, tablet: 2, mobile: 1 },
    shipping: { cost: 100 },
    contact: { whatsapp: "", email: "", phone: "" },
    social: {},
    navigation: [],
    footer: { description: "", columns: [] },
  }),
}));

const validBody = {
  customer: {
    name: "أحمد محمد",
    phone: "01012345678",
    whatsapp: "01012345678",
    governorate: "القاهرة",
    city: "مدينة نصر",
    addressDetails: "شارع 9، مبنى 12",
  },
  items: [{ productId: "PF020", sizeLabel: "50 مل", quantity: 2 }],
};

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validBody),
  });
}

// Imported after the mocks are registered.
const { POST } = await import("./route");

beforeEach(() => {
  sendOrderEmail.mockReset();
  sendOrderWhatsApp.mockReset();
  saveOrder.mockReset();
  incrementProductSales.mockReset();

  sendOrderEmail.mockResolvedValue(undefined);
  sendOrderWhatsApp.mockResolvedValue(undefined);
  saveOrder.mockResolvedValue({ ok: false });
  incrementProductSales.mockResolvedValue(undefined);
});

describe("POST /api/orders — optional persistence", () => {
  it("persists the order when the store is available", async () => {
    saveOrder.mockResolvedValue({ ok: true });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(saveOrder).toHaveBeenCalledTimes(1);
    const [saved] = saveOrder.mock.calls[0];
    expect(saved.orderNumber).toBe("PDF-20261020-00001");
    expect(saved.total).toBe(1100);
  });

  it("still returns 201 when the store throws but email succeeded", async () => {
    saveOrder.mockRejectedValue(new Error("redis down"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(sendOrderEmail).toHaveBeenCalledTimes(1);
  });

  it("still returns 201 when the store throws but WhatsApp succeeded", async () => {
    sendOrderEmail.mockRejectedValue(new Error("no api key"));
    saveOrder.mockRejectedValue(new Error("redis down"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(sendOrderWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("still returns 201 when the store times out (never resolves)", async () => {
    saveOrder.mockImplementation(() => new Promise(() => {}));

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  }, 10_000);

  it("returns 201 when no persistence env is configured and email works", async () => {
    saveOrder.mockResolvedValue({ ok: false });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  });
});

describe("POST /api/orders — all channels failed", () => {
  it("returns 503 in production so the customer keeps the cart", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      sendOrderEmail.mockRejectedValue(new Error("no api key"));
      sendOrderWhatsApp.mockRejectedValue(new Error("no recipients"));
      saveOrder.mockResolvedValue({ ok: false });

      const response = await POST(makeRequest());
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toContain("جرّب تاني");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns 201 outside production (nothing is configured locally)", async () => {
    sendOrderEmail.mockRejectedValue(new Error("no api key"));
    sendOrderWhatsApp.mockRejectedValue(new Error("no recipients"));
    saveOrder.mockResolvedValue({ ok: false });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  });
});

describe("POST /api/orders — response payload", () => {
  it("prices the order on the server and returns the server order number", async () => {
    const response = await POST(makeRequest());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      orderNumber: "PDF-20261020-00001",
      subtotal: 1000,
      shippingCost: 100,
      total: 1100,
    });
  });
});
