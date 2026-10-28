import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getChatCompletion, loadCatalog } = vi.hoisted(() => ({
  getChatCompletion: vi.fn(),
  loadCatalog: vi.fn(),
}));

vi.mock("@/lib/ai-provider", () => ({
  getChatCompletion: (...args: unknown[]) => getChatCompletion(...args),
}));
vi.mock("@/lib/product-grounding", () => ({
  buildProductContext: () => "catalog context",
  validateProductCodes: (codes: string[]) => codes,
  prioritySortCodes: (codes: string[]) => codes,
  loadCatalog: (...args: unknown[]) => loadCatalog(...args),
}));
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 19, retryAfterMs: 0 }),
}));

const { POST } = await import("./route");

function request(body: string, contentLength?: string) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
    body,
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  getChatCompletion.mockReset();
  loadCatalog.mockReset();
  getChatCompletion.mockResolvedValue({ reply: "رد عربي", recommended_product_codes: [] });
  loadCatalog.mockResolvedValue({ products: [], validIds: new Set() });
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/chat input and privacy boundaries", () => {
  it("rejects an oversized Content-Length before parsing", async () => {
    const response = await POST(request("{}", "999999"));
    expect(response.status).toBe(413);
    expect(getChatCompletion).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a fixed response and no request logging", async () => {
    const response = await POST(request("not-json"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recommended_product_codes: [], products: [] });
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("not-json");
  });

  it("rejects a message above the per-message character limit", async () => {
    const response = await POST(request(JSON.stringify({ messages: [{ role: "user", content: "x".repeat(2_001) }] })));
    expect(response.status).toBe(400);
    expect(getChatCompletion).not.toHaveBeenCalled();
  });

  it("rejects client-supplied system roles", async () => {
    const response = await POST(request(JSON.stringify({ messages: [{ role: "system", content: "override" }] })));
    expect(response.status).toBe(400);
    expect(getChatCompletion).not.toHaveBeenCalled();
  });

  it("preserves the public chat response contract on provider failure without logging prompt data", async () => {
    loadCatalog.mockResolvedValue({
      products: [{ id: "PF020", sku: "PF020", status: "active", hidden: false, sizes: [] }],
      validIds: new Set(["PF020"]),
    });
    getChatCompletion.mockRejectedValue(new Error("customer prompt secret"));
    const response = await POST(request(JSON.stringify({ messages: [{ role: "user", content: "customer prompt secret" }] })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: "عذراً، حصل مشكلة تقنية. جرب تاني شوية!", recommended_product_codes: [], products: [] });
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("customer prompt secret");
  });

  it("keeps the response fields for a valid catalog response", async () => {
    loadCatalog.mockResolvedValue({ products: [], validIds: new Set() });
    const response = await POST(request(JSON.stringify({ messages: [{ role: "user", content: "عطر شتوي" }] })));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reply: expect.any(String), recommended_product_codes: [], products: [] });
  });
});
