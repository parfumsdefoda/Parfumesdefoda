import { isRedisConfigured, redis } from "./redis";

/**
 * Order number generator — SERVER ONLY.
 *
 * Format: PDF-YYYYMMDD-NNNNN
 * Example: PDF-20260716-00125
 *
 * The number is always minted on the server so two customers can never receive
 * the same one. The 5-character sequence comes from an atomic Upstash counter
 * (one per day) when Redis is configured, and falls back to a random base32
 * suffix otherwise.
 *
 * SERVER-ONLY: imports the Upstash client — never import this from a
 * `"use client"` component.
 */

const COUNTER_TTL_SECONDS = 60 * 60 * 48;

/** Unambiguous base32 alphabet (no 0/O, 1/I/L). */
const SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Format a date as YYYYMMDD (local time, matching the store's timezone). */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Assemble the final order number from a date and a sequence/suffix.
 * Numeric sequences are zero-padded to 5 digits.
 */
export function formatOrderNumber(
  date: Date,
  sequence: number | string,
): string {
  const suffix =
    typeof sequence === "number"
      ? String(sequence).padStart(5, "0")
      : sequence;
  return `PDF-${formatDateStr(date)}-${suffix}`;
}

/** Random 5-character base32 suffix used when Redis is unavailable. */
export function randomOrderSuffix(length = 5): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * SUFFIX_ALPHABET.length);
    suffix += SUFFIX_ALPHABET[index];
  }
  return suffix;
}

/**
 * Generate the next order number for the given day.
 * Uses Upstash INCR when configured; otherwise a random suffix.
 */
export async function generateOrderNumber(date: Date = new Date()): Promise<string> {
  if (!isRedisConfigured()) {
    return formatOrderNumber(date, randomOrderSuffix());
  }

  const key = `order-seq:${formatDateStr(date)}`;

  try {
    const sequence = await redis.incr(key);
    if (sequence === 1) {
      await redis.expire(key, COUNTER_TTL_SECONDS);
    }
    return formatOrderNumber(date, sequence);
  } catch {
    // Redis hiccup must never block an order — fall back to a random suffix.
    return formatOrderNumber(date, randomOrderSuffix());
  }
}
