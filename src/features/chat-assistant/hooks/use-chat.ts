"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessageData, ChatApiResponse } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseChatReturn {
  messages: ChatMessageData[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    // Cancel any pending request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);

    // Add user message
    const userMessage: ChatMessageData = {
      id: generateId(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("فشل الاتصال بالخادم");
      }

      const data: ChatApiResponse = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessageData = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
        recommendedProductCodes: data.recommended_product_codes,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Request was cancelled, don't show error
      }
      const errorMessage = err instanceof Error ? err.message : "حصل مشكلة غير متوقعة";
      setError(errorMessage);

      // Add error message as assistant
      const errorAssistant: ChatMessageData = {
        id: generateId(),
        role: "assistant",
        content: "عذراً، حصل مشكلة. جرب تاني شوية!",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorAssistant]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
