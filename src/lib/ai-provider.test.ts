import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock OpenAI SDK before importing the module under test.
// completions.create controlled per-test via createMock.
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

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { getChatCompletion } from "./ai-provider";

const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  createMock.mockReset();
});

afterEach(() => {
  if (ORIGINAL_OPENAI_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY;
  }
});

function mockResponse(content: string) {
  createMock.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

const systemPrompt = "أجب بصيغة JSON دائمًا";

describe("getChatCompletion (openai provider)", () => {
  it("parses a valid JSON response", async () => {
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
    expect(params.model).toBe("gpt-5.6-luna");
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

  it("returns raw text with no codes when the response is not valid JSON", async () => {
    mockResponse("مرحبا بك! كيف أساعدك؟");

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toBe("مرحبا بك! كيف أساعدك؟");
    expect(result.recommended_product_codes).toEqual([]);
  });

  it("unwraps double-encoded JSON (nested object inside reply)", async () => {
    mockResponse(
      JSON.stringify({
        reply: JSON.stringify({
          reply: "برشحلك امبريال فالي وتيروني",
          recommended_product_codes: ["PF090", "PF170"],
        }),
      }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر شتوي" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "برشحلك امبريال فالي وتيروني",
      recommended_product_codes: ["PF090", "PF170"],
    });
  });

  it("unwraps a top-level stringified JSON object", async () => {
    mockResponse(
      JSON.stringify(
        JSON.stringify({ reply: "ترشيحاتي جاهزة", recommended_product_codes: ["PF010"] }),
      ),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "ترشيحاتي جاهزة",
      recommended_product_codes: ["PF010"],
    });
  });

  it("stops unwrapping at plain text replies", async () => {
    mockResponse(
      JSON.stringify({ reply: "ده رد عادي مش JSON", recommended_product_codes: [] }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "ده رد عادي مش JSON",
      recommended_product_codes: [],
    });
  });

  it("repairs malformed nested JSON (unescaped quotes inside the reply)", async () => {
    const nested = `{"reply": "أرشحلك عطر \"امبريال فالي\" و \"تيروني\" للشتاء", "recommended_product_codes": ["PF090", "PF170"]}`;
    mockResponse(JSON.stringify({ reply: nested }));

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "أرشحلك عطر \"امبريال فالي\" و \"تيروني\" للشتاء",
      recommended_product_codes: ["PF090", "PF170"],
    });
  });

  it("extracts codes written inline in prose when the JSON field is missing", async () => {
    mockResponse(
      JSON.stringify({
        reply: "برشحلك امبريال فالي (PF090) وتيروني (PF170) — ثباتهم صاروخي",
      }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toContain("امبريال فالي");
    expect(result.recommended_product_codes).toEqual(["PF090", "PF170"]);
  });

  it("does not invent codes from prose when none are present", async () => {
    mockResponse(
      JSON.stringify({ reply: "تمام! حابب أعرف أكتر عن ذوقك الأول", recommended_product_codes: [] }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.recommended_product_codes).toEqual([]);
  });

  it("logs the provider on success", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      mockResponse(JSON.stringify({ reply: "تمام", recommended_product_codes: [] }));

      await getChatCompletion([{ role: "user", content: "عايز عطر" }], systemPrompt);

      const servedLine = infoSpy.mock.calls
        .map((c) => String(c[0]))
        .find((line) => line.includes("Serving response via provider"));
      expect(servedLine).toContain("openai");
      expect(servedLine).toContain("gpt-5.6-luna");
    } finally {
      infoSpy.mockRestore();
    }
  });
});
