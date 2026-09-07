/**
 * AI Provider abstraction layer (server-only).
 *
 * Provides a single `getChatCompletion()` function that routes to whichever
 * provider is configured via the `AI_PROVIDER` env var. Adding a new provider
 * only requires adding a new case in the switch and implementing the adapter.
 *
 * IMPORTANT: This file must NEVER be imported from a "use client" component.
 * It reads API keys from process.env, imports server-only SDKs, and would
 * leak secrets into the client bundle. Its only consumer is the server-side
 * /api/chat route.
 *
 * Providers supported:
 *   - "openai" (default) — OpenAI (gpt-4o-mini) via the openai SDK
 *   - "gemini"           — Google Gemini via @google/generative-ai
 *   - "groq"             — Groq via OpenAI-compatible SDK (TODO: implement)
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";
import { logError } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatCompletionResult {
  reply: string;
  recommended_product_codes: string[];
}

// ─── Provider Config ────────────────────────────────────────────────────────

type AIProvider = "gemini" | "groq" | "openai";

/** Default provider used when AI_PROVIDER is unset or invalid. */
const DEFAULT_PROVIDER: AIProvider = "openai";

/**
 * Single constant for the OpenAI model. If OpenAI deprecates this model
 * (404 / "model no longer available"), replace it with the replacement
 * name suggested in the API error message.
 */
const OPENAI_MODEL = "gpt-4o-mini";

const GEMINI_MODEL = "gemini-3.6-flash";

/** Graceful fallback shown to the user when a provider call fails. */
const FALLBACK_REPLY = "معلش، حصلت مشكلة تقنية، جرب تاني كمان شوية 🙏";

export interface ProviderSelection {
  provider: AIProvider;
  /** Human-readable reason — used for Vercel-log diagnostics. */
  reason: string;
}

/**
 * Resolve which provider AI_PROVIDER selects, and why.
 * Exported so the /api/chat route can log the decision per request.
 */
export function resolveProvider(): ProviderSelection {
  const configured = process.env.AI_PROVIDER;
  if (!configured) {
    return {
      provider: DEFAULT_PROVIDER,
      reason: `AI_PROVIDER env var not set — using default "${DEFAULT_PROVIDER}"`,
    };
  }
  const provider = configured as AIProvider;
  const valid: AIProvider[] = ["gemini", "groq", "openai"];
  if (!valid.includes(provider)) {
    return {
      provider: DEFAULT_PROVIDER,
      reason: `AI_PROVIDER env var was "${configured}" (unknown) — using default "${DEFAULT_PROVIDER}"`,
    };
  }
  return { provider, reason: `AI_PROVIDER env var was "${configured}"` };
}

/**
 * True when a provider error is a rate-limit (429) or quota-exhaustion
 * failure — the only errors that trigger the cross-provider fallback.
 * Matches both the OpenAI SDK (error.status) and Google's SDK
 * (message text, e.g. "[429 Too Many Requests] ... Quota exceeded ...").
 */
function isRateLimitOrQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { status?: number; message?: string };
  if (e.status === 429) return true;
  if (
    typeof e.message === "string" &&
    /(429|quota|too many requests|rate[ -]?limit)/i.test(e.message)
  ) {
    return true;
  }
  return false;
}

// ─── OpenAI Adapter ─────────────────────────────────────────────────────────

/** Throws on any failure — the orchestrator handles fallback + logging. */
async function callOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("[ai-provider] OPENAI_API_KEY is not set in environment variables");
  }

  const client = new OpenAI({ apiKey });

  // Convert our message format to OpenAI's format: system prompt first,
  // then the conversation history (model role maps to "assistant").
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "model" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: openaiMessages,
    // JSON mode: the system prompt instructs the model to answer with
    // { reply, recommended_product_codes } and "json" appears in the prompt.
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("[ai-provider] OpenAI returned an empty response");
  }

  return parseAIResponse(content);
}

// ─── Gemini Adapter ─────────────────────────────────────────────────────────

/** Throws on any failure — the orchestrator handles fallback + logging. */
async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[ai-provider] GEMINI_API_KEY is not set in environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  // Convert our message format to Gemini's format
  // Gemini uses alternating user/model turns (no system role in history)
  const geminiHistory = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "model" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const lastUserMessage = messages[messages.length - 1];
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("[ai-provider] Last message must be from user");
  }

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(lastUserMessage.content);
  const responseText = result.response.text();

  return parseAIResponse(responseText);
}

// ─── Response Parser ────────────────────────────────────────────────────────

/** Extract product codes from a `"recommended_product_codes": [...]` fragment. */
function extractCodesFromJsonFragment(fragment: string): string[] {
  const match = fragment.match(/"recommended_product_codes"\s*:\s*\[([^\]]*)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, "").replace(/\\"/g, "\""))
    .filter((s) => /^PF\d{3}$/.test(s));
}

/** Extract product codes written inline in prose, e.g. "امبريال فالي (PF090)". */
function extractCodesFromProse(text: string): string[] {
  const matches = text.match(/\bPF\d{3}\b/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Lenient unwrap for double-encoded JSON whose inner JSON is malformed
 * (Gemini often leaves Arabic quotes unescaped inside the nested string).
 * Best-effort: extract the reply text between the outer markers and any
 * codes fragment. Returns null when the text doesn't look nested at all.
 */
function repairNestedJson(raw: string): { reply: string; codes: string[] } | null {
  const codes = extractCodesFromJsonFragment(raw);
  // Greedy match to the LAST `", "recommended_product_codes"` so unescaped
  // quotes inside the reply don't truncate it.
  const match = raw.match(/\{\s*"reply"\s*:\s*"([\s\S]*)"\s*,\s*"recommended_product_codes"/);
  if (!match) return null;
  return {
    reply: match[1].replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\//g, "/"),
    codes,
  };
}

/**
 * Parse the AI response into structured output.
 * Handles JSON mode responses, markdown fences, double-encoded JSON
 * (valid or malformed), and plain-text fallbacks.
 */
function parseAIResponse(text: string): ChatCompletionResult {
  try {
    // Strip markdown code fences if the model wrapped the JSON in them
    const cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as unknown;

    let reply: string;
    let codes: string[];
    if (typeof parsed === "string") {
      // Top-level stringified JSON (model double-encoded the whole object)
      reply = parsed;
      codes = [];
    } else if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      reply = typeof obj.reply === "string" ? obj.reply : cleaned;
      codes = Array.isArray(obj.recommended_product_codes)
        ? (obj.recommended_product_codes as unknown[]).filter(
            (c): c is string => typeof c === "string",
          )
        : [];
    } else {
      reply = cleaned;
      codes = [];
    }

    // Some models (Gemini especially) occasionally double-encode the JSON:
    // the whole { reply, recommended_product_codes } object comes back as a
    // string inside `reply`, leaving codes empty. Unwrap a few levels so the
    // real reply text and product codes are extracted instead of showing raw
    // JSON to the user.
    for (let depth = 0; depth < 3 && codes.length === 0; depth++) {
      if (typeof reply !== "string") break;
      try {
        const nested = JSON.parse(reply) as Record<string, unknown>;
        if (typeof nested.reply !== "string") break;
        reply = nested.reply;
        if (Array.isArray(nested.recommended_product_codes)) {
          codes = (nested.recommended_product_codes as unknown[]).filter(
            (c): c is string => typeof c === "string",
          );
        }
      } catch {
        // The nested JSON may be malformed (unescaped quotes) — repair it
        const repaired = repairNestedJson(reply);
        if (!repaired) break; // plain text reply — nothing to unwrap
        reply = repaired.reply;
        codes = repaired.codes;
      }
    }

    // Last resort: the model often writes codes inline in the prose
    // ("امبريال فالي (PF090)") even when it omits the JSON field.
    // The route validates/grounds these against the catalog anyway.
    if (codes.length === 0) {
      codes = extractCodesFromProse(reply);
    }

    return { reply, recommended_product_codes: codes };
  } catch {
    // If JSON parsing fails, return the raw text with no recommendations
    return { reply: text, recommended_product_codes: [] };
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

const MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  openai: OPENAI_MODEL,
  gemini: GEMINI_MODEL,
  groq: "unimplemented",
};

/**
 * Get a chat completion from the configured AI provider.
 *
 * Provider selection: `AI_PROVIDER` env var (defaults to "openai").
 * Safety fallback: if the primary provider fails with a rate-limit (429)
 * or quota error, the SAME request is retried ONCE with the other
 * implemented provider (if its API key is present). Any other error is
 * NOT retried — it degrades straight to the graceful Arabic fallback so
 * the chat route never crashes or leaks raw API errors.
 *
 * @param messages - Full conversation history (user/model alternating)
 * @param systemPrompt - System instruction for the AI
 * @returns Structured response with reply text and recommended product codes
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  const { provider, reason } = resolveProvider();

  // Primary first; on rate-limit/quota we retry once with the other one
  const fallback: AIProvider = provider === "openai" ? "gemini" : "openai";
  const candidates: AIProvider[] = [provider, fallback];

  let lastError: unknown = null;

  for (const candidate of candidates) {
    if (candidate === "groq") {
      lastError = new Error(
        `[ai-provider] Provider "groq" is not implemented. Use AI_PROVIDER=openai or gemini.`,
      );
      continue;
    }

    try {
      const result =
        candidate === "openai"
          ? await callOpenAI(messages, systemPrompt)
          : await callGemini(messages, systemPrompt);

      // Log clearly which provider actually served the final response
      console.info(
        candidate === provider
          ? `[ai-provider] Serving response via provider: ${candidate} (primary — ${reason})`
          : `[ai-provider] Serving response via provider: ${candidate} (fallback — primary "${provider}" failed after rate-limit/quota)`,
      );
      return result;
    } catch (error) {
      lastError = error;
      logError("chat.provider_error", error, {
        provider: candidate,
        model: MODEL_BY_PROVIDER[candidate],
      });

      if (!isRateLimitOrQuotaError(error)) {
        // Non-rate-limit failure — don't burn the fallback provider
        break;
      }
      console.info(
        `[ai-provider] Provider "${candidate}" hit a rate-limit/quota error — retrying once with "${fallback}"`,
      );
    }
  }

  // Every attempt failed — never crash or leak raw errors to the frontend
  if (lastError) {
    console.info(
      `[ai-provider] All providers failed; returning graceful fallback (last error: ${lastError instanceof Error ? lastError.message.slice(0, 120) : "unknown"})`,
    );
  }
  return { reply: FALLBACK_REPLY, recommended_product_codes: [] };
}