import type { LocaleMessages } from "@/types/services";

/**
 * Get a nested value from locale messages using a dot-separated path.
 *
 * Pure function — no server-side dependencies. Safe for client components.
 *
 * @example
 *   t(messages, "cart.title") // "سلة التسوق"
 *   t(messages, "home.addToCart") // "أضف إلى السلة"
 */
export function t(
  messages: LocaleMessages,
  path: string,
  fallback?: string,
): string {
  const keys = path.split(".");
  let current: unknown = messages;

  for (const key of keys) {
    if (current === null || current === undefined) return fallback ?? path;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : (fallback ?? path);
}
