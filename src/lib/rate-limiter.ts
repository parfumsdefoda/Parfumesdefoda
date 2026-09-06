/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding window counter per key (IP address). Resets on server restart.
 * For production-grade rate limiting, use Upstash Rate Limiting or similar.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if a request is rate-limited.
 *
 * @param key - Unique identifier (e.g. IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns `{ allowed: boolean; remaining: number; retryAfterMs: number }`
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  // Clean up old entries periodically (every 1000 requests)
  if (store.size > 1000) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    retryAfterMs: 0,
  };
}
