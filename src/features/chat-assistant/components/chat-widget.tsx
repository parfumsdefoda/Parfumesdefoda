"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChat } from "../hooks/use-chat";
import { ChatWindow } from "./chat-window";
import { ChatTriggerCard } from "./chat-trigger-card";

// ─── Config ─────────────────────────────────────────────────────────────────

/** Delay before the first-visit attention pulse (ms) */
const ATTRACT_DELAY_MS = 3500;

/** How long the first-visit attention pulse runs (ms) */
const ATTRACT_DURATION_MS = 5200;

/** Session storage key to track if the attention pulse was already shown */
const ATTRACT_SHOWN_KEY = "parfumsdefoda-chat-attract-seen";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatWidget — floating chat entry point and expandable chat window.
 *
 * Design (brand-consistent):
 *   - Premium card-style trigger (gold gradient border over brand purple,
 *     gold icon medallion, shimmer sweep) — see ChatTriggerCard
 *   - First-visit attention pulse (sessionStorage-gated, inside useEffect)
 *   - Hover/tap scale feedback
 *   - Positioned bottom-start (bottom-right in RTL) — free corner,
 *     no other fixed element occupies it (header: top, toasts: bottom-center)
 *   - z-[60] keeps the trigger above toasts (z-50) so it stays tappable
 *   - Clicking a recommended product inside the chat minimizes the window
 *     (conversation state is preserved in useChat — reopening restores it)
 *
 * Self-contained client component: no environment variables, no server data
 * loading, no provider dependencies. Wrapped in ChatErrorBoundary at the
 * mount point so a failure here never takes down the rest of the site.
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [attract, setAttract] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const attractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attractEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

  // First-visit attention pulse — sessionStorage access inside useEffect only
  useEffect(() => {
    try {
      const alreadySeen = sessionStorage.getItem(ATTRACT_SHOWN_KEY);
      if (alreadySeen) return;
    } catch {
      // sessionStorage unavailable (private browsing edge case) — skip
      return;
    }

    attractTimerRef.current = setTimeout(() => {
      setAttract(true);

      try {
        sessionStorage.setItem(ATTRACT_SHOWN_KEY, "true");
      } catch {
        // Ignore — worst case, the pulse shows again next time
      }

      // Stop the attention pulse after the duration
      attractEndRef.current = setTimeout(() => {
        setAttract(false);
      }, ATTRACT_DURATION_MS);
    }, ATTRACT_DELAY_MS);

    return () => {
      if (attractTimerRef.current) clearTimeout(attractTimerRef.current);
      if (attractEndRef.current) clearTimeout(attractEndRef.current);
    };
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setAttract(false);
    // Cancel pending attract timers if the user interacts before they fire
    if (attractTimerRef.current) clearTimeout(attractTimerRef.current);
    if (attractEndRef.current) clearTimeout(attractEndRef.current);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  /** Recommended product clicked inside chat → minimize, keep conversation */
  const handleNavigateToProduct = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* ─── Chat Window (expanded) ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              "fixed bottom-24 start-4 z-50",
              "h-[520px] w-[370px] max-w-[calc(100vw-2rem)]",
              "max-h-[calc(100dvh-8rem)]",
              "overflow-hidden rounded-2xl",
              "border border-[var(--neutral-100)]",
              "shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
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
              onNavigateToProduct={handleNavigateToProduct}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Trigger (card when closed, round close when open) ─── */}
      <div className="fixed bottom-5 start-4 z-[60]">
        <ChatTriggerCard
          isOpen={isOpen}
          isHovered={isHovered}
          attract={attract}
          onToggle={toggleChat}
          onHoverChange={setIsHovered}
        />
      </div>
    </>
  );
}