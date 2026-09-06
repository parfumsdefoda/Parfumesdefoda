"use client";

/**
 * TypingIndicator — animated dots shown while the AI is thinking.
 * Uses CSS animations only (no JS timers for animation).
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3" role="status" aria-label="المساعد يكتب...">
      <span className="inline-block h-2 w-2 animate-[bounce_1.4s_infinite_0ms] rounded-full bg-[var(--neutral-400)]" />
      <span className="inline-block h-2 w-2 animate-[bounce_1.4s_infinite_200ms] rounded-full bg-[var(--neutral-400)]" />
      <span className="inline-block h-2 w-2 animate-[bounce_1.4s_infinite_400ms] rounded-full bg-[var(--neutral-400)]" />
      <span className="sr-only">جاري الكتابة...</span>
    </div>
  );
}
