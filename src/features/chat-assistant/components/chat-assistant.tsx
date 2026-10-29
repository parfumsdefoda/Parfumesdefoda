"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isAdvisorLauncherVisible } from "@/lib/route-shell";
import { subscribeAdvisor } from "../advisor-bus";
import { ChatErrorBoundary } from "./chat-error-boundary";
import {
  AdvisorLauncher,
  type AdvisorLauncherLabels,
} from "./advisor-launcher";

/**
 * The panel — and the chat hook, the window and the recommendation cards — is
 * a separate chunk, loaded on the first hover/focus/click of the launcher or
 * when the browser is idle. The floating button itself carries only an icon.
 */
const AdvisorPanel = dynamic(
  () => import("./chat-widget").then((module) => module.ChatWidget),
  { ssr: false },
);

export interface ChatAssistantProps {
  labels: {
    title: string;
    close: string;
  };
  launcher: AdvisorLauncherLabels;
}

/**
 * ChatAssistant — the single mount point for the advisor.
 *
 * The launcher is always on the page (except on cart/checkout, decided by the
 * route rule). The advisor panel is imported lazily so the first paint and the
 * first-load JavaScript stay clear of the chat code; a request made before the
 * chunk arrives is kept by the advisor bus and consumed when the panel mounts.
 */
export function ChatAssistant({ labels, launcher }: ChatAssistantProps) {
  const pathname = usePathname() ?? "/";
  const allowed = isAdvisorLauncherVisible(pathname);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (armed) return;
    // Any open request mounts the chunk; the bus remembers the click itself.
    const unsubscribe = subscribeAdvisor(() => setArmed(true));

    let handle: number | undefined;
    let timer: number | undefined;
    if (allowed) {
      if (typeof window.requestIdleCallback === "function") {
        handle = window.requestIdleCallback(() => setArmed(true), {
          timeout: 6_000,
        });
      } else {
        timer = window.setTimeout(() => setArmed(true), 4_000);
      }
    }

    return () => {
      unsubscribe();
      if (handle !== undefined) window.cancelIdleCallback?.(handle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [allowed, armed]);

  return (
    <>
      {armed && (
        <ChatErrorBoundary>
          <AdvisorPanel labels={labels} />
        </ChatErrorBoundary>
      )}
      <AdvisorLauncher labels={launcher} onIntent={() => setArmed(true)} />
    </>
  );
}
