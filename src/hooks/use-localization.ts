"use client";

import { useCallback, useMemo } from "react";
import type { LocaleMessages } from "@/types/services";
import { t } from "@/lib/locale";

export interface UseLocalizationReturn {
  /** Raw locale messages */
  messages: LocaleMessages;
  /** Whether locale is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Translation function */
  t: (path: string, fallback?: string) => string;
  /** Get all messages for a namespace */
  getSection: (namespace: string) => Record<string, string>;
}

/**
 * Hook for consuming locale messages and providing a translation function.
 * All user-facing Arabic text flows through this hook.
 *
 * Data is pre-loaded by the Server Component and passed as initialMessages.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useLocalization(
  initialMessages: LocaleMessages = {},
): UseLocalizationReturn {
  const messages = initialMessages;

  const translate = useCallback(
    (path: string, fallback?: string) => t(messages, path, fallback),
    [messages],
  );

  const getSection = useCallback(
    (namespace: string): Record<string, string> => {
      const section = messages[namespace];
      if (typeof section === "object" && section !== null) {
        return section as Record<string, string>;
      }
      return {};
    },
    [messages],
  );

  // Memoize to stabilize references across renders
  const memoizedT = useMemo(() => translate, [translate]);
  const memoizedGetSection = useMemo(() => getSection, [getSection]);

  return {
    messages,
    isLoading: false,
    error: null,
    t: memoizedT,
    getSection: memoizedGetSection,
  };
}
