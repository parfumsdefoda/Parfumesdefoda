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

/** Graceful fallback shown to the user when a provider call fails. */
const FALLBACK_REPLY = "معلش، حصلت مشكلة تقنية، جرب تاني كمان شوية 🙏";

function getProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER;
  if (!configured) {
    return DEFAULT_PROVIDER;
  }
  const provider = configured as AIProvider;
  const valid: AIProvider[] = ["gemini", "groq", "openai"];
  if (!valid.includes(provider)) {
    console.warn(
      `[ai-provider] Unknown provider "${configured}", falling back to ${DEFAULT_PROVIDER}`,
    );
    return DEFAULT_PROVIDER;
  }
  return provider;
}

// ─── OpenAI Adapter ─────────────────────────────────────────────────────────

async function callOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  try {
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
  } catch (error) {
    // Never crash the chat route or leak raw API error details to the frontend.
    logError("chat.provider_error", error, { provider: "openai", model: OPENAI_MODEL });
    return { reply: FALLBACK_REPLY, recommended_product_codes: [] };
  }
}

// ─── Gemini Adapter ─────────────────────────────────────────────────────────

async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("[ai-provider] GEMINI_API_KEY is not set in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model: GenerativeModel = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
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
  } catch (error) {
    // Never crash the chat route or leak raw API error details to the frontend.
    logError("chat.provider_error", error, { provider: "gemini", model: "gemini-3.6-flash" });
    return { reply: FALLBACK_REPLY, recommended_product_codes: [] };
  }
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

/**
 * Get a chat completion from the configured AI provider.
 *
 * @param messages - Full conversation history (user/model alternating)
 * @param systemPrompt - System instruction for the AI
 * @returns Structured response with reply text and recommended product codes
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatCompletionResult> {
  const provider = getProvider();

  switch (provider) {
    case "openai":
      return callOpenAI(messages, systemPrompt);
    case "gemini":
      return callGemini(messages, systemPrompt);
    case "groq":
      throw new Error(
        `[ai-provider] Provider "groq" is not yet implemented. Use AI_PROVIDER=openai or gemini.`,
      );
    default:
      throw new Error(`[ai-provider] Unknown provider: ${provider}`);
  }
}