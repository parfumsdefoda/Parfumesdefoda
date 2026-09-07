"use client";

import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Copy (Egyptian Arabic — matches the site's voice) ─────────────────────

/** Card headline — short, catchy invitation to try the assistant. */
const HEADLINE = "🔮 مش عارف تختار عطرك؟ اسألني!";

/** Supporting line under the headline. */
const SUBLINE = "دقيقة واحدة وهرشحلك العطر المناسب 🎯";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatTriggerCardProps {
  /** Chat window open state — when open the trigger collapses to a close button */
  isOpen: boolean;
  /** Hover/focus state (drives scale + glow intensification) */
  isHovered: boolean;
  /** First-visit attention pulse active (sessionStorage-gated in parent) */
  attract: boolean;
  onToggle: () => void;
  onHoverChange: (hovered: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ChatTriggerCard — the floating chat entry point, styled like the site's
 * premium "فاخر" product cards:
 *
 *   - Animated gold gradient border (same premium-shimmer keyframes used by
 *     featured product cards) over a deep brand-purple gradient body
 *   - Gold circular icon with a continuous glow pulse (chat-glow keyframes)
 *   - Soft shimmer sweep across the card
 *   - Compact card shape (~72px tall, 200-260px wide, capped on mobile)
 *   - When the chat is open it collapses to a small round close button
 *
 * The card IS the invitation — there is no separate tooltip bubble anymore.
 */
export function ChatTriggerCard({
  isOpen,
  isHovered,
  attract,
  onToggle,
  onHoverChange,
}: ChatTriggerCardProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {isOpen ? (
        /* ─── Open state: compact round close button ─── */
        <motion.button
          key="close"
          type="button"
          initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onToggle}
          aria-label="إغلاق المحادثة"
          aria-expanded={true}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-[var(--neutral-600)] text-white",
            "shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
            "transition-all duration-300 ease-out",
            "hover:bg-[var(--neutral-700)] hover:scale-105",
            "active:scale-95",
            "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-gold)]",
          )}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </motion.button>
      ) : (
        /* ─── Closed state: premium invitation card ─── */
        <motion.button
          key="card"
          type="button"
          data-testid="chat-widget-button"
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={onToggle}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          aria-label={`فتح مساعد العطور — ${HEADLINE}`}
          aria-expanded={false}
          className={cn(
            "group relative max-w-[calc(100vw-2rem)] rounded-3xl",
            "transition-transform duration-300 ease-out",
            isHovered ? "scale-[1.03]" : "scale-100",
            attract && "animate-[chat-attract_2.6s_ease-in-out_2]",
            "active:scale-[0.98]",
            "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-gold)]",
          )}
        >
          {/* Animated gold gradient border (same premium-shimmer as فاخر cards) */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-[2px] rounded-[24px]",
              "bg-[linear-gradient(120deg,#b8960c,#d4af37,#f5d060,#d4af37,#b8960c)]",
              "bg-[length:200%_200%] animate-[premium-shimmer_4s_linear_infinite]",
              "opacity-80 transition-opacity duration-300 group-hover:opacity-100",
            )}
          />

          {/* Continuous pulsing gold glow ring */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-1 rounded-[28px]",
              "animate-[chat-glow_3s_ease-in-out_infinite]",
            )}
          />

          {/* Card body — brand purple gradient */}
          <span
            className={cn(
              "relative flex items-center gap-3 rounded-3xl px-4 py-3 text-start",
              "bg-[linear-gradient(135deg,#7b3ba8_0%,#632989_55%,#4a1f6b_100%)]",
              "text-white shadow-[0_10px_32px_rgba(99,41,137,0.45)]",
            )}
          >
            {/* Gold icon medallion */}
            <span
              aria-hidden="true"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                "bg-[linear-gradient(135deg,#f5d060,#d4af37)]",
                "shadow-[0_0_18px_rgba(212,175,55,0.55)]",
              )}
            >
              <MessageCircle className="h-5 w-5 text-[#4a1f6b]" />
            </span>

            {/* Copy */}
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold leading-snug">
                {HEADLINE}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-white/85">
                {SUBLINE}
              </span>
            </span>
          </span>

          {/* Soft shimmer sweep across the card */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          >
            <span
              className={cn(
                "absolute -inset-y-[20%] left-0 w-16 rotate-12",
                "bg-gradient-to-r from-transparent via-white/20 to-transparent",
                "animate-[chat-sweep_3.2s_ease-in-out_infinite]",
              )}
            />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}