"use client";

import { useEffect } from "react";
import { ChatErrorBoundary } from "./chat-error-boundary";
import { ChatWidget } from "./chat-widget";

/**
 * ChatAssistant — the single mount point for the chat feature.
 *
 * Mounted directly in the root layout (src/app/layout.tsx) as a sibling
 * of <Providers>, inside <body>. It is a plain client component with:
 *   - No server-only imports (no node:fs, no services)
 *   - No provider dependencies (works even if Providers fail)
 *   - Its own error boundary, so a failure here degrades to nothing
 *     instead of crashing the site
 *
 * Logs a mount marker on the client so production debugging can confirm
 * whether the widget tree is even attempting to render.
 */
export function ChatAssistant() {
  useEffect(() => {
    console.info("[ChatAssistant] mounted");
  }, []);

  return (
    <ChatErrorBoundary>
      <ChatWidget />
    </ChatErrorBoundary>
  );
}