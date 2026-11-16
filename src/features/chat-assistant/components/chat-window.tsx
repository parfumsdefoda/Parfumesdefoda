"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "../types";
import { CompactProductCard } from "./compact-product-card";
import { TypingIndicator } from "./typing-indicator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  messages: ChatMessageData[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onClearMessages: () => void;
  onClose: () => void;
  closeLabel: string;
  /** Called when a recommended product card is clicked — the panel closes. */
  onNavigateToProduct?: () => void;
}

const SUGGESTIONS = ["رجالي للصيف", "هدية", "ثبات قوي"];

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatWindow — header, transcript, suggestions and input.
 *
 * The old purple sheet chrome is replaced by the boutique card: an ink header
 * with the gold avatar and two lines of copy, cream assistant bubbles, ink user
 * bubbles, gold-outlined suggestion chips that disappear after the first
 * message, and a round input with an ink send button. Auto-scroll, the product
 * recommendations, the clear action and the error row are unchanged.
 */
export function ChatWindow({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearMessages,
  onClose,
  closeLabel,
  onNavigateToProduct,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      onSendMessage(trimmed);
      setInput("");
    },
    [input, isLoading, onSendMessage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 bg-[var(--boutique-ink)] px-4 py-3 text-[var(--boutique-white)]">
        <span
          aria-hidden="true"
          className="pf-gold-surface grid size-9 shrink-0 place-items-center rounded-full text-[var(--boutique-ink)]"
        >
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold leading-tight">مساعد الذوق</h2>
          <p className="text-[14px] leading-snug text-[var(--gold-300)]">
            يرشّح لك العطر في ثوانٍ
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearMessages}
            aria-label="مسح المحادثة"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--gold-300)] transition-colors hover:bg-[var(--gold-700)] hover:text-[var(--boutique-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-300)]"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--gold-300)] transition-colors hover:bg-[var(--gold-700)] hover:text-[var(--boutique-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-300)]"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      {/* ─── Transcript ─── */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--boutique-white)] px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="rounded-[14px] rounded-br-[4px] bg-[var(--cream)] px-3.5 py-2.5 text-[14px] leading-[1.7] text-[var(--boutique-ink)]">
              أهلاً بيك! قولي إيه اللي بتدور عليه، وأرشّح لك عطر من التشكيلة.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSendMessage(suggestion)}
                  className="rounded-full border border-[var(--gold-500)] bg-[var(--boutique-white)] px-3 py-1.5 text-[14px] font-medium text-[var(--gold-700)] transition-colors hover:bg-[var(--gold-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] px-3.5 py-2.5 text-[14px] leading-[1.7]",
                msg.role === "user"
                  ? "rounded-[14px] rounded-bl-[4px] bg-[var(--boutique-ink)] text-[var(--boutique-white)]"
                  : "rounded-[14px] rounded-br-[4px] bg-[var(--cream)] text-[var(--boutique-ink)]",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.products && msg.products.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {msg.products.map((product) => (
                    <CompactProductCard
                      key={product.id}
                      product={product}
                      onClick={onNavigateToProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-[14px] rounded-br-[4px] bg-[var(--cream)]">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div
          className="mx-4 mb-1 rounded-lg border border-[var(--gold-700)] bg-[var(--cream)] px-3 py-2 text-[14px] text-[var(--gold-700)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ─── Input ─── */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--boutique-line)] px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            disabled={isLoading}
            aria-label="رسالتك"
            className="h-11 min-w-0 flex-1 rounded-full border border-[var(--boutique-line)] bg-[var(--boutique-white)] px-4 text-[14px] text-[var(--boutique-ink)] placeholder:text-[var(--boutique-ink)]/50 focus:border-[var(--gold-500)] focus:outline-none focus:ring-1 focus:ring-[var(--gold-500)]/40 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            aria-label="إرسال"
            className="size-11 shrink-0 rounded-full bg-[var(--boutique-ink)] text-[var(--gold-300)] hover:bg-[var(--gold-700)] disabled:opacity-40"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
