"use client";

import dynamic from "next/dynamic";

const ChatAssistantLazy = dynamic(
  () => import("./chat-assistant").then((module) => module.ChatAssistant),
);

/**
 * AssistantMount — the assistant's only entry point.
 *
 * While `data/settings.json` keeps `features.assistant` off, this renders
 * nothing and the dynamic import below never runs, so the launcher, panel
 * and advisor code cost 0 KiB. Flip the flag back on and everything loads
 * unchanged.
 */
export interface AssistantMountProps {
  enabled: boolean;
  labels: {
    title: string;
    close: string;
  };
  launcher: {
    open: string;
  };
}

export function AssistantMount({ enabled, labels, launcher }: AssistantMountProps) {
  if (!enabled) return null;
  return <ChatAssistantLazy labels={labels} launcher={launcher} />;
}
