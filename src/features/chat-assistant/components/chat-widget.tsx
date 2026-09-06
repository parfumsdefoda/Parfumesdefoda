"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatProduct } from "../types";
import { useChat } from "../hooks/use-chat";
import { ChatWindow } from "./chat-window";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  /** All products for resolving recommendation codes */
  products: ChatProduct[];
}

// ─── Config ─────────────────────────────────────────────────────────────────

/** Delay before showing the pulse hint (ms) */
const PULSE_DELAY_MS = 5000;

/** Session storage key to track if the hint was already shown */
const HINT_SHOWN_KEY = "parfumsdefoda-chat-hint-shown";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatWidget — floating chat button and expandable chat window.
 *
 * Features:
 *   - Floating button in bottom-left corner (RTL: start side)
 *   - Pulse animation hint after delay (first visit only)
 *   - Expandable chat window with framer-motion
 *   - All UI in Arabic, RTL layout
 */
export function ChatWidget({ products }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

  // Show pulse hint after delay (first visit only)
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(HINT_SHOWN_KEY);
    if (alreadyShown) return;

    pulseTimerRef.current = setTimeout(() => {
      setShowPulse(true);
      sessionStorage.setItem(HINT_SHOWN_KEY, "true");

      // Auto-hide pulse after 8 seconds
      setTimeout(() => setShowPulse(false), 8000);
    }, PULSE_DELAY_MS);

    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowPulse(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* ─── Chat Window (expanded) ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed bottom-20 start-4 z-50",
              "h-[500px] w-[360px] max-w-[calc(100vw-2rem)]",
              "overflow-hidden rounded-2xl",
              "border border-[var(--neutral-100)]",
              "shadow-[0_16px_64px_rgba(0,0,0,0.15)]",
              "flex flex-col",
              "bg-[var(--bg-primary)]",
            )}
            role="dialog"
            aria-label="مساعد العطور"
          >
            {/* Close button — floating above the window */}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClose}
              aria-label="إغلاق المحادثة"
              className={cn(
                "absolute top-2 left-2 z-10",
                "h-7 w-7 rounded-full",
                "bg-[var(--bg-secondary)] text-[var(--neutral-500)]",
                "hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-700)]",
                "shadow-sm",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </Button>

            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              error={error}
              onSendMessage={sendMessage}
              onClearMessages={clearMessages}
              products={products}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Button ─── */}
      <div className="fixed bottom-4 start-4 z-50">
        <Button
          onClick={toggleChat}
          aria-label={isOpen ? "إغلاق المحادثة" : "فتح مساعد العطور"}
          aria-expanded={isOpen}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-[var(--color-accent)] text-white",
            "hover:bg-[var(--color-secondary)]",
            "transition-all duration-300",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
            // Pulse animation
            showPulse && !isOpen && "animate-[pulse_2s_ease-in-out_3]",
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Pulse ring animation */}
        {showPulse && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_3] bg-[var(--color-accent)]/30 pointer-events-none" />
        )}
      </div>
    </>
  );
}
