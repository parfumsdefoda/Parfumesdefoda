"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { isAdvisorLauncherVisible } from "@/lib/route-shell";
import { openAdvisor } from "../advisor-bus";

export interface AdvisorLauncherLabels {
  /** Accessible name and visible label of the button. */
  open: string;
}

export interface AdvisorLauncherProps {
  labels: AdvisorLauncherLabels;
  /** Called on hover/focus/click so the chat chunk can load before it opens. */
  onIntent?: () => void;
}

/**
 * AdvisorLauncher — one floating pill at the bottom-left.
 *
 * The old purple circle and its timed "محتار في الاختيار؟" bubble are gone: the
 * pill carries the invitation in its own label, so nothing appears on the page
 * without a click. Visibility still comes from the route rule, the cart/modals
 * (`:has` in CSS) and the footer observer; the PDP offset is unchanged.
 */
export function AdvisorLauncher({ labels, onIntent }: AdvisorLauncherProps) {
  const pathname = usePathname() ?? "/";
  const allowed = isAdvisorLauncherVisible(pathname);
  const rootRef = useRef<HTMLDivElement>(null);

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
      className="fixed left-4 z-40 sm:left-6"
      style={{
        bottom:
          "calc(1.5rem + env(safe-area-inset-bottom, 0px) + var(--advisor-launcher-offset, 0px))",
      }}
    >
      <button
        type="button"
        data-advisor-launcher-button=""
        aria-label={labels.open}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onClick={openAdvisor}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--boutique-ink)] px-5 text-[14px] font-medium text-[var(--gold-300)] shadow-soft transition-colors hover:bg-[var(--gold-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <Sparkles aria-hidden="true" className="size-4" />
        {labels.open}
      </button>
    </div>
  );
}
