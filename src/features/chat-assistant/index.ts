/**
 * Chat Assistant feature — barrel export.
 *
 * NOTE: ChatWidgetLoader is a Server Component (loads products via node:fs)
 * and must NEVER be exported from this barrel — it is imported directly
 * by layout.tsx via the explicit component path to prevent Turbopack from
 * tracing server-only dependencies into client bundles.
 *
 * All exports below are client-safe ("use client" components or pure types).
 */
export { ChatWidget } from "./components/chat-widget";
export { ChatWindow } from "./components/chat-window";
export { CompactProductCard } from "./components/compact-product-card";
export { TypingIndicator } from "./components/typing-indicator";
export { useChat } from "./hooks/use-chat";
export type { ChatMessageData, ChatProduct, ChatApiResponse } from "./types";
