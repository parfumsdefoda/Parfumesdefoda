import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock both SDKs before importing the module under test.
// OpenAI: completions.create controlled per-test via createMock.
// Gemini: sendMessage controlled per-test via geminiSendMock.
// Class implementations are required so the stubs can be constructed
// (`new OpenAI({ apiKey })`, `new GoogleGenerativeAI(apiKey)`).
const { createMock, geminiSendMock, OpenAIStub, GeminiStub } = vi.hoisted(() => {
  const createMock = vi.fn();
  const geminiSendMock = vi.fn();
  class OpenAIStub {
    chat = { completions: { create: createMock } };
  }
  class GeminiModelStub {
    startChat() {
      return {
        // Mirror the real SDK: rejections surface from `await sendMessage(...)`
        sendMessage: async () => {
          const text = await geminiSendMock();
          return { response: { text: () => text } };
        },
      };
    }
  }
  class GeminiStub {
    getGenerativeModel() {
      return new GeminiModelStub();
    }
  }
  return { createMock, geminiSendMock, OpenAIStub, GeminiStub };
});

vi.mock("openai", () => ({
  default: OpenAIStub,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: GeminiStub,
}));

import { getChatCompletion } from "./ai-provider";

const ORIGINAL_PROVIDER = process.env.AI_PROVIDER;
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GEMINI_API_KEY = "gemini-test-key";
  createMock.mockReset();
  geminiSendMock.mockReset();
});

afterEach(() => {
  if (ORIGINAL_PROVIDER === undefined) {
    delete process.env.AI_PROVIDER;
  } else {
    process.env.AI_PROVIDER = ORIGINAL_PROVIDER;
  }
  if (ORIGINAL_OPENAI_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY;
  }
  if (ORIGINAL_GEMINI_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY;
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

  it("unwraps double-encoded JSON (nested object inside reply)", async () => {
    // Gemini occasionally wraps the whole JSON object as a string inside `reply`
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
    // Gemini nested the object with unescaped Arabic quotes inside the reply
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
});

// ─── Provider fallback on rate-limit / quota errors ─────────────────────────

describe("getChatCompletion (rate-limit fallback)", () => {
  function geminiReply() {
    geminiSendMock.mockReturnValue(
      JSON.stringify({ reply: "رد من جيميني", recommended_product_codes: ["PF010"] }),
    );
  }

  it("retries the same request with Gemini when OpenAI returns a 429", async () => {
    createMock.mockRejectedValue(Object.assign(new Error("429 Too Many Requests"), { status: 429 }));
    geminiReply();

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result).toEqual({
      reply: "رد من جيميني",
      recommended_product_codes: ["PF010"],
    });
    expect(geminiSendMock).toHaveBeenCalledTimes(1);
  });

  it("retries with Gemini when OpenAI hits a quota error (message-based detection)", async () => {
    createMock.mockRejectedValue(
      new Error("Quota exceeded for metric: generate_content_free_tier_requests"),
    );
    geminiReply();

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toBe("رد من جيميني");
  });

  it("serves via OpenAI when Gemini (primary) is rate-limited", async () => {
    process.env.AI_PROVIDER = "gemini";
    geminiSendMock.mockRejectedValue(
      Object.assign(new Error("[429 Too Many Requests] quota"), { status: 429 }),
    );
    mockResponse(JSON.stringify({ reply: "رد من أوبن إيه آي", recommended_product_codes: [] }));

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toBe("رد من أوبن إيه آي");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("returns the graceful fallback when both providers are rate-limited", async () => {
    createMock.mockRejectedValue(Object.assign(new Error("429 Too Many Requests"), { status: 429 }));
    geminiSendMock.mockRejectedValue(
      Object.assign(new Error("429 Too Many Requests"), { status: 429 }),
    );

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toContain("مشكلة تقنية");
    expect(result.recommended_product_codes).toEqual([]);
  });

  it("does NOT fall back on non-rate-limit errors (e.g. 401 invalid key)", async () => {
    createMock.mockRejectedValue(new Error("401 Invalid API key"));

    const result = await getChatCompletion(
      [{ role: "user", content: "عايز عطر" }],
      systemPrompt,
    );

    expect(result.reply).toContain("مشكلة تقنية");
    expect(geminiSendMock).not.toHaveBeenCalled();
  });

  it("logs which provider actually served the final response", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      createMock.mockRejectedValue(Object.assign(new Error("429"), { status: 429 }));
      geminiReply();

      await getChatCompletion([{ role: "user", content: "عايز عطر" }], systemPrompt);

      const servedLine = infoSpy.mock.calls
        .map((c) => String(c[0]))
        .find((line) => line.includes("Serving response via provider"));
      expect(servedLine).toContain("gemini");
      expect(servedLine).toContain("fallback");
    } finally {
      infoSpy.mockRestore();
    }
  });
});