/**
 * Order number generator.
 *
 * Format: PDF-YYYYMMDD-NNNNN
 * Example: PDF-20260716-00125
 *
 * Counter resets daily (tracked via localStorage key + date).
 */

const STORAGE_PREFIX = "parfumsdefoda-order-counter-";

/**
 * Generate a unique order number.
 * Uses localStorage to persist the daily counter across page refreshes.
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = formatDateStr(now);
  const counter = getNextCounter(dateStr);
  return `PDF-${dateStr}-${String(counter).padStart(5, "0")}`;
}

/**
 * Format a date as YYYYMMDD.
 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Get and increment the daily counter.
 * Falls back to a random number if localStorage is unavailable.
 */
function getNextCounter(dateStr: string): number {
  const key = `${STORAGE_PREFIX}${dateStr}`;

  try {
    const stored = localStorage.getItem(key);
    const current = stored ? parseInt(stored, 10) : 0;
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    // localStorage unavailable (SSR or private browsing)
    // Return a random 5-digit number as fallback
    return Math.floor(Math.random() * 90000) + 10000;
  }
}
