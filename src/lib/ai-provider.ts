/**
 * AI Provider — OpenAI only (server-only).
 *
 * Single `getChatCompletion()` function that calls OpenAI (gpt-4o-mini).
 *
 * IMPORTANT: This file must NEVER be imported from a "use client" component.
 * It reads API keys from process.env, imports server-only SDKs, and would
 * leak secrets into the client bundle. Its only consumer is the server-side
 * /api/chat route.
 */

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

// ─── Config ─────────────────────────────────────────────────────────────────

const OPENAI_MODEL = "gpt-4o-mini";

/** Graceful fallback shown to the user when the provider call fails. */
const FALLBACK_REPLY = "معلش، حصلت مشكلة تقنية، جرب تاني كمان شوية 🙏";

export interface ProviderSelection {
  provider: "openai";
  reason: string;
}

/**
 * Returns the current provider selection (always OpenAI).
 * Exported so the /api/chat route can log it per request.
 */
export function resolveProvider(): ProviderSelection {
  return {
    provider: "openai",
    reason: `AI_PROVIDER=openai (gpt-4o-mini)`,
  };
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
 * Lenient unwrap for double-encoded JSON whose inner JSON is malformed.
 * Best-effort: extract the reply text between the outer markers and any
 * codes fragment. Returns null when the text doesn't look nested at all.
 */
function repairNestedJson(raw: string): { reply: string; codes: string[] } | null {
  const codes = extractCodesFromJsonFragment(raw);
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
    const cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as unknown;

    let reply: string;
    let codes: string[];
    if (typeof parsed === "string") {
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

    // Unwrap double-encoded JSON (the whole object comes back as a string
    // inside `reply`, leaving codes empty).
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
        const repaired = repairNestedJson(reply);
        if (!repaired) break;
        reply = repaired.reply;
        codes = repaired.codes;
      }
    }

    if (codes.length === 0) {
      codes = extractCodesFromProse(reply);
    }

    return { reply, recommended_product_codes: codes };
  } catch {
    return { reply: text, recommended_product_codes: [] };
  }
}

// ─── OpenAI Call ────────────────────────────────────────────────────────────

async function callOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("[ai-provider] OPENAI_API_KEY is not set in environment variables");
  }

  const client = new OpenAI({ apiKey });

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

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Get a chat completion from OpenAI (gpt-4o-mini).
 *
 * On failure (rate-limit, invalid key, quota, deprecated model), logs the
 * full error and returns a graceful Arabic fallback — never crashes the route
 * or leaks raw API error text to the frontend.
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  try {
    const result = await callOpenAI(messages, systemPrompt);
    console.info("[ai-provider] Serving response via provider: openai (gpt-4o-mini)");
    return result;
  } catch (error) {
    logError("chat.provider_error", error, { provider: "openai", model: OPENAI_MODEL });
    console.info(
      `[ai-provider] OpenAI call failed; returning graceful fallback (error: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"})`,
    );
    return { reply: FALLBACK_REPLY, recommended_product_codes: [] };
  }
}
