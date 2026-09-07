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
}

// ─── Response Parser ────────────────────────────────────────────────────────

/**
 * Parse the AI response into structured output.
 * Handles both JSON mode responses and fallback text parsing.
 */
function parseAIResponse(text: string): ChatCompletionResult {
  try {
    // Strip markdown code fences if the model wrapped the JSON in them
    const cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const reply = typeof parsed.reply === "string" ? parsed.reply : cleaned;
    const codes = Array.isArray(parsed.recommended_product_codes)
      ? (parsed.recommended_product_codes as unknown[]).filter(
          (c): c is string => typeof c === "string",
        )
      : [];

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