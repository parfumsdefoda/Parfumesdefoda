"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { openAdvisor } from "@/features/chat-assistant/advisor-bus";

export interface AdvisorLinkProps {
  label: string;
  variant?: "primary" | "tertiary" | "secondary";
  className?: string;
}

/**
 * AdvisorLink — the "اِسأل المساعد" entry points on the homepage.
 *
 * The intro and the advisor band are Server Components; only this button is
 * client code, and it does one thing: ask the advisor panel to open. The
 * primary variant is the square purple button that replaced the gold outline
 * on the dark band.
 */
export function AdvisorLink({
  label,
  variant = "tertiary",
  className,
}: AdvisorLinkProps) {
  return (
    <button
      type="button"
      onClick={openAdvisor}
      className={cn(
        "inline-flex h-11 items-center gap-2 px-5 text-[14px] font-medium",
        "transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-[var(--purple-700)] text-[var(--paper)] hover:bg-[var(--ink)] focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-[var(--paper)]",
        variant === "tertiary" &&
          "text-[var(--ink)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-[var(--paper)]",
        variant === "secondary" &&
          "border border-[var(--brand-gold)] text-[var(--color-on-dark)] hover:bg-[var(--purple-700)] focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-[var(--purple-950)]",
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
