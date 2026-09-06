/**
 * Chat Assistant feature — barrel export.
 *
 * Everything in this feature is client-safe ("use client" components or
 * pure types) — no node:fs, no services, no server-only imports.
 * The chat widget receives its product data from the /api/chat response,
 * so it needs no server-side data loading at render time.
 */
export { ChatAssistant } from "./components/chat-assistant";
export { ChatWidget } from "./components/chat-widget";
export { ChatWindow } from "./components/chat-window";
export { CompactProductCard } from "./components/compact-product-card";
export { TypingIndicator } from "./components/typing-indicator";
export { useChat } from "./hooks/use-chat";
export type { ChatMessageData, ChatProduct, ChatApiResponse } from "./types";
