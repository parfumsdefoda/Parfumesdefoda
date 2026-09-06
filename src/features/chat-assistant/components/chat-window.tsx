"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/features/toast";
import type { ChatMessageData, ChatProduct } from "../types";
import { CompactProductCard } from "./compact-product-card";
import { TypingIndicator } from "./typing-indicator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  messages: ChatMessageData[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onClearMessages: () => void;
  /** Products to resolve recommendation codes against */
  products: ChatProduct[];
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatWindow — the main chat interface with message list, input, and product cards.
 *
 * Features:
 *   - Auto-scroll to bottom on new messages
 *   - Product cards rendered inline for recommendations
 *   - Add-to-cart wired to CartProvider
 *   - RTL Arabic UI
 */
export function ChatWindow({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearMessages,
  products,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useCart();
  const { showToast } = useToast();

  // Build a lookup map from product code → product
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on mount
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

  const handleAddToCart = useCallback(
    (product: ChatProduct, sizeLabel: string, price: number) => {
      const inStockSize = product.sizes.find((s) => s.label === sizeLabel);
      if (!inStockSize || !inStockSize.inStock) return;

      addItem({
        productId: product.id,
        sizeLabel,
        price,
        name: product.name,
        image: product.image,
      });
      showToast(`تمت إضافة ${product.name} (${sizeLabel}) إلى السلة`, "success");
    },
    [addItem, showToast],
  );

  // Resolve product codes to actual products
  const resolveProducts = useCallback(
    (codes: string[]): ChatProduct[] => {
      return codes
        .map((code) => productMap.get(code))
        .filter((p): p is ChatProduct => p !== undefined);
    },
    [productMap],
  );

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]">
            <span className="text-sm text-white" aria-hidden="true">💬</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--neutral-800)]">
              مساعد العطور
            </h2>
            <p className="text-[10px] text-[var(--neutral-400)]">
              Parfums De Foda
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClearMessages}
            aria-label="مسح المحادثة"
            className="text-[var(--neutral-400)] hover:text-[var(--neutral-600)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <span className="text-2xl" aria-hidden="true">🌸</span>
            </div>
            <p className="text-sm font-medium text-[var(--neutral-600)] mb-1">
              أهلاً! 👋
            </p>
            <p className="text-xs text-[var(--neutral-400)] leading-relaxed">
              أنا مساعد العطور بتاع Parfums De Foda. قولي إيه اللي بتدور عليه وأنا هرشحلك أحلى عطر يناسبك!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5",
                msg.role === "user"
                  ? "bg-[var(--color-accent)] text-white rounded-br-md"
                  : "bg-[var(--bg-secondary)] text-[var(--neutral-700)] rounded-bl-md border border-[var(--neutral-100)]",
              )}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>

              {/* Product recommendation cards */}
              {msg.recommendedProductCodes && msg.recommendedProductCodes.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {resolveProducts(msg.recommendedProductCodes).map((product) => (
                    <CompactProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] border border-[var(--neutral-100)]">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="mx-3 mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600" role="alert">
          {error}
        </div>
      )}

      {/* ─── Input ─── */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--neutral-100)] px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            disabled={isLoading}
            aria-label="رسالتك"
            className={cn(
              "flex-1 rounded-full border border-[var(--neutral-200)] bg-[var(--bg-secondary)]",
              "px-4 py-2 text-[13px] text-[var(--neutral-700)]",
              "placeholder:text-[var(--neutral-400)]",
              "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30",
              "disabled:opacity-50",
              "transition-colors",
            )}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className={cn(
              "h-9 w-9 rounded-full shrink-0",
              "bg-[var(--color-accent)] text-white",
              "hover:bg-[var(--color-secondary)]",
              "disabled:opacity-40",
              "transition-colors",
            )}
            aria-label="إرسال"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
