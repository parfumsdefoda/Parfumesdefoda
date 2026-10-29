"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { isAdvisorLauncherVisible } from "@/lib/route-shell";
import {
  dismissGreeting,
  greetingServerSnapshot,
  greetingSnapshot,
  showGreetingOnce,
  subscribeGreeting,
} from "../advisor-greeting";
import { openAdvisor } from "../advisor-bus";

export interface AdvisorLauncherLabels {
  /** Accessible name of the button. */
  open: string;
  /** One-line greeting bubble. */
  greeting: string;
  dismiss: string;
}

export interface AdvisorLauncherProps {
  labels: AdvisorLauncherLabels;
  /** Called on hover/focus/click so the chat chunk can load before it opens. */
  onIntent?: () => void;
}

/** How long the page is quiet before the greeting appears. */
const GREETING_DELAY = 8_000;

/**
 * AdvisorLauncher — the 56px floating button.
 *
 * Visibility is decided by the pure `isAdvisorLauncherVisible` route rule plus
 * CSS for transient overlays: the cart drawer writes `data-cart-open` on
 * <html>, and any open Sheet/Dialog is matched with `:has`, so neither the
 * cart nor a modal ever re-renders this component. A footer observer keeps it
 * off the footer links, and the PDP writes a bar offset so it sits above the
 * phone purchase bar.
 *
 * The chat panel itself is not imported here — the launcher is a lucide icon,
 * a label and the greeting store.
 */
export function AdvisorLauncher({ labels, onIntent }: AdvisorLauncherProps) {
  const pathname = usePathname() ?? "/";
  const allowed = isAdvisorLauncherVisible(pathname);
  const greeting = useSyncExternalStore(
    subscribeGreeting,
    greetingSnapshot,
    greetingServerSnapshot,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  // The greeting waits for a quiet moment and never appears on cart/checkout.
  useEffect(() => {
    if (!allowed) return;
    const timer = window.setTimeout(() => {
      showGreetingOnce();
    }, GREETING_DELAY);
    return () => window.clearTimeout(timer);
  }, [allowed]);

  // Do not sit on top of the footer links.
  useEffect(() => {
    if (!allowed) return;
    const footer = document.querySelector("footer");
    const root = rootRef.current;
    if (!footer || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        root.dataset.footerVisible = entry.isIntersecting ? "true" : "false";
      },
      { rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [allowed]);

  if (!allowed) return null;

  return (
    <div
      ref={rootRef}
      data-advisor-launcher=""
      data-footer-visible="false"
      className="fixed end-4 z-40 flex flex-col items-end gap-3"
      style={{
        bottom:
          "calc(1rem + env(safe-area-inset-bottom, 0px) + var(--advisor-launcher-offset, 0px))",
      }}
    >
      {greeting && (
        <div
          role="status"
          className="relative w-60 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 pe-12 text-caption leading-relaxed text-[var(--color-text)] shadow-lifted"
        >
          {labels.greeting}
          {/* 44px target: the bubble is small, the tap area is not. */}
          <button
            type="button"
            onClick={dismissGreeting}
            aria-label={labels.dismiss}
            className="absolute end-0 top-0 inline-flex size-11 items-center justify-center rounded-pill text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-inset"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <button
        type="button"
        data-advisor-launcher-button=""
        aria-label={labels.open}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onClick={() => {
          dismissGreeting();
          openAdvisor();
        }}
        className="relative inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lifted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-apple)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <Sparkles aria-hidden="true" className="size-6" />
      </button>
    </div>
  );
}
