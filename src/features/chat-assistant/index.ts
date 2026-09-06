/**
 * Chat Assistant feature — barrel export.
 *
 * The ChatWidget is mounted globally in layout.tsx via ChatWidgetLoader (Server Component).
 * ChatWindow and CompactProductCard are used internally.
 */
export { ChatWidget } from "./components/chat-widget";
export { ChatWidgetLoader } from "./components/chat-widget-loader";
export { ChatWindow } from "./components/chat-window";
export { CompactProductCard } from "./components/compact-product-card";
export { TypingIndicator } from "./components/typing-indicator";
export { useChat } from "./hooks/use-chat";
export type { ChatMessageData, ChatProduct, ChatApiResponse } from "./types";
