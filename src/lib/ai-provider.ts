/**
 * AI Provider abstraction layer (server-only).
 *
 * Provides a single `getChatCompletion()` function that routes to whichever
 * provider is configured via the `AI_PROVIDER` env var. Adding a new provider
 * only requires adding a new case in the switch and implementing the adapter.
 *
 * Providers supported:
 *   - "gemini" (default) — Google Gemini via @google/generative-ai
 *   - "groq"             — Groq via OpenAI-compatible SDK (TODO: implement)
 *   - "openai"           — OpenAI via openai SDK (TODO: implement)
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

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

function getProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "gemini";
  const valid: AIProvider[] = ["gemini", "groq", "openai"];
  if (!valid.includes(provider)) {
    console.warn(`[ai-provider] Unknown provider "${provider}", falling back to gemini`);
    return "gemini";
  }
  return provider;
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
    const parsed = JSON.parse(text) as Record<string, unknown>;

    const reply = typeof parsed.reply === "string" ? parsed.reply : text;
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
    case "gemini":
      return callGemini(messages, systemPrompt);
    case "groq":
    case "openai":
      throw new Error(
        `[ai-provider] Provider "${provider}" is not yet implemented. Use AI_PROVIDER=gemini.`,
      );
    default:
      throw new Error(`[ai-provider] Unknown provider: ${provider}`);
  }
}
