"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { openAdvisor } from "@/features/chat-assistant/advisor-bus";

export interface AdvisorLinkProps {
  label: string;
  variant?: "tertiary" | "secondary";
  className?: string;
}

/**
 * AdvisorLink — the "اِسأل المساعد" entry points on the homepage.
 *
 * The hero and the advisor band are Server Components; only this button is
 * client code, and it does one thing: ask the advisor panel to open.
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
        "inline-flex h-11 items-center gap-2 rounded-pill px-5 text-caption font-bold",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variant === "tertiary" &&
          "text-[var(--color-on-dark)] underline-offset-4 hover:underline focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-[var(--purple-950)]",
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
