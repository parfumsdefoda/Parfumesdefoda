"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChat } from "../hooks/use-chat";
import { ChatWindow } from "./chat-window";

// ─── Config ─────────────────────────────────────────────────────────────────

/** Delay before showing the tooltip (ms) */
const TOOLTIP_DELAY_MS = 4000;

/** How long the tooltip stays visible before auto-dismissing (ms) */
const TOOLTIP_DISMISS_MS = 6000;

/** Session storage key to track if the tooltip was already shown */
const TOOLTIP_SHOWN_KEY = "parfumsdefoda-chat-tooltip-seen";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatWidget — floating chat button and expandable chat window.
 *
 * Design (brand-consistent):
 *   - 60px purple (--color-accent) round button with gold (--color-gold) glow
 *   - First-visit tooltip in Egyptian Arabic (sessionStorage-gated)
 *   - Hover/tap scale feedback
 *   - Positioned bottom-start (bottom-right in RTL) — free corner,
 *     no other fixed element occupies it (header: top, toasts: bottom-center)
 *
 * Self-contained client component: no environment variables, no server data
 * loading, no provider dependencies. Wrapped in ChatErrorBoundary at the
 * mount point so a failure here never takes down the rest of the site.
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

  // First-visit tooltip — sessionStorage access is inside useEffect only
  useEffect(() => {
    try {
      const alreadySeen = sessionStorage.getItem(TOOLTIP_SHOWN_KEY);
      if (alreadySeen) return;
    } catch {
      // sessionStorage unavailable (private browsing edge case) — skip
      return;
    }

    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(true);

      try {
        sessionStorage.setItem(TOOLTIP_SHOWN_KEY, "true");
      } catch {
        // Ignore — worst case, tooltip shows again next time
      }

      // Auto-dismiss tooltip after delay
      dismissTimerRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, TOOLTIP_DISMISS_MS);
    }, TOOLTIP_DELAY_MS);

    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowTooltip(false);
    // Cancel pending tooltip timers if user clicks before they fire
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissTooltip = useCallback(() => {
    setShowTooltip(false);
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
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── First-visit Tooltip ─── */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              "fixed bottom-24 start-4 z-50",
              "max-w-[240px] rounded-2xl rounded-br-md",
              "border border-[var(--color-gold)]/30",
              "bg-[var(--bg-primary)] px-4 py-3",
              "shadow-[0_8px_32px_rgba(212,175,55,0.15)]",
            )}
            role="status"
          >
            <p className="text-[13px] leading-relaxed text-[var(--neutral-700)]">
              محتاج مساعدة في اختيار عطرك؟ 👋
            </p>
            <button
              type="button"
              onClick={dismissTooltip}
              className={cn(
                "mt-1.5 text-[11px] font-medium",
                "text-[var(--color-accent)] hover:text-[var(--color-secondary)]",
                "transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              )}
              aria-label="إغلاق"
            >
              لا شكراً
            </button>
            {/* Arrow pointing to the button */}
            <div className="absolute -bottom-1.5 start-6 h-3 w-3 rotate-45 border-b border-s border-[var(--color-gold)]/30 bg-[var(--bg-primary)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Button ───
          z-[60] keeps the FAB above toasts (z-50, bottom-center) so it is
          always visible and tappable even when a toast briefly slides in. */}
      <div className="fixed bottom-5 start-4 z-[60]">
        {/* Gold glow ring — always visible, subtle continuous pulse */}
        <span
          className={cn(
            "absolute inset-0 rounded-full pointer-events-none",
            "border-2 border-[var(--color-gold)]/40",
            !isOpen && "animate-[chat-glow_3s_ease-in-out_infinite]",
          )}
          aria-hidden="true"
        />

        <Button
          data-testid="chat-widget-button"
          onClick={toggleChat}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isOpen ? "إغلاق المحادثة" : "فتح مساعد العطور"}
          aria-expanded={isOpen}
          className={cn(
            "relative h-[60px] w-[60px] rounded-full",
            "bg-[var(--color-accent)] text-white",
            "shadow-[0_6px_24px_rgba(99,41,137,0.4)]",
            "transition-all duration-300 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-gold)]",
            "hover:bg-[var(--color-accent)]/90 hover:shadow-[0_8px_32px_rgba(99,41,137,0.5)]",
            // Hover/tap scale feedback
            (isHovered || isOpen) && "scale-105",
            "active:scale-95",
            // When chat is open, slightly smaller with different bg
            isOpen &&
              "h-12 w-12 bg-[var(--neutral-600)] hover:bg-[var(--neutral-700)] shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
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
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <MessageCircle className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </>
  );
}