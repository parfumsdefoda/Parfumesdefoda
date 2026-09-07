import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the OpenAI SDK before importing the module under test.
// The client is replaced with a stub whose completions.create is controlled
// per-test via createMock. A class implementation is required so the stub
// can be constructed with `new OpenAI({ apiKey })`.
const { createMock, OpenAIStub } = vi.hoisted(() => {
  const createMock = vi.fn();
  class OpenAIStub {
    chat = { completions: { create: createMock } };
  }
  return { createMock, OpenAIStub };
});

vi.mock("openai", () => ({
  default: OpenAIStub,
}));

import { getChatCompletion } from "./ai-provider";

const ORIGINAL_PROVIDER = process.env.AI_PROVIDER;
const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  createMock.mockReset();
});

afterEach(() => {
  if (ORIGINAL_PROVIDER === undefined) {
    delete process.env.AI_PROVIDER;
  } else {
    process.env.AI_PROVIDER = ORIGINAL_PROVIDER;
  }
  if (ORIGINAL_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_KEY;
  }
});

function mockResponse(content: string) {
  createMock.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

const systemPrompt = "أجب بصيغة JSON دائمًا";

describe("getChatCompletion (openai provider)", () => {
  it("defaults to openai when AI_PROVIDER is unset and parses a valid JSON response", async () => {
    delete process.env.AI_PROVIDER;
    mockResponse(
      JSON.stringify({
        reply: "رشحتلك عطرين حلوين",
        recommended_product_codes: ["PF010", "PF020"],
      }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر شتوي" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "رشحتلك عطرين حلوين",
      recommended_product_codes: ["PF010", "PF020"],
    });
  });

  it("sends the system prompt first and maps model role to assistant", async () => {
    mockResponse(JSON.stringify({ reply: "تمام", recommended_product_codes: [] }));

    await getChatCompletion(
      [
        { role: "user", content: "مرحبا" },
        { role: "model", content: "أهلاً" },
        { role: "user", content: "عايز عطر رجالي" },
      ],
      systemPrompt,
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    const [params] = createMock.mock.calls[0];
    expect(params.messages[0]).toEqual({ role: "system", content: systemPrompt });
    expect(params.messages[1]).toEqual({ role: "user", content: "مرحبا" });
    expect(params.messages[2]).toEqual({ role: "assistant", content: "أهلاً" });
    expect(params.messages[3]).toEqual({ role: "user", content: "عايز عطر رجالي" });
    expect(params.model).toBe("gpt-4o-mini");
    expect(params.response_format).toEqual({ type: "json_object" });
  });

  it("parses JSON wrapped in markdown code fences", async () => {
    mockResponse(
      '```json\n{"reply": "فيه كود فنس", "recommended_product_codes": ["PF030"]}\n```',
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "اقترح حاجة" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "فيه كود فنس",
      recommended_product_codes: ["PF030"],
    });
  });

  it("returns a graceful fallback (never throws) when the API call fails", async () => {
    createMock.mockRejectedValue(new Error("401 Invalid API key"));

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toContain("مشكلة تقنية");
    expect(result.recommended_product_codes).toEqual([]);
  });

  it("returns a graceful fallback when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toContain("مشكلة تقنية");
    expect(result.recommended_product_codes).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to openai when AI_PROVIDER is an unknown value", async () => {
    process.env.AI_PROVIDER = "not-a-provider";
    mockResponse(JSON.stringify({ reply: "تمام", recommended_product_codes: [] }));

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toBe("تمام");
  });

  it("returns raw text with no codes when the response is not valid JSON", async () => {
    mockResponse("مرحبا بك! كيف أساعدك؟");

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toBe("مرحبا بك! كيف أساعدك؟");
    expect(result.recommended_product_codes).toEqual([]);
  });
});