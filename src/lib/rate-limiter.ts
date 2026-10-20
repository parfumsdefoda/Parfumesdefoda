import { isRedisConfigured, redis } from "./redis";

/**
 * Rate limiters for API routes.
 *
 * `checkRateLimit` is a simple in-memory fixed-window counter (per key, resets
 * on server restart) — good enough for a single instance and for local dev.
 *
 * `checkOrderRateLimit` prefers a true sliding window in Upstash Redis (shared
 * across instances) and falls back to the in-memory counter when Redis is not
 * configured or errors out. A limiter outage must never block real orders.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Orders allowed per window, and the window itself. */
export const ORDER_RATE_LIMIT_MAX = 5;
export const ORDER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a request is rate-limited (in-memory fixed window).
 *
 * @param key - Unique identifier (e.g. IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000,
): RateLimitResult {
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

/**
 * Sliding-window limiter backed by Redis sorted sets.
 * Returns `null` when Redis is unavailable so the caller can fall back.
 */
async function checkRedisSlidingWindow(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  if (!isRedisConfigured()) return null;

  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member });
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const count = Number(results[2]);

    if (!Number.isFinite(count)) return null;

    if (count > maxRequests) {
      // Drop the entry we just added so a rejected attempt does not extend
      // the window for the requests that are legitimately inside it.
      await redis.zrem(key, member).catch(() => undefined);
      return { allowed: false, remaining: 0, retryAfterMs: windowMs };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
      retryAfterMs: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Rate limit order submission: 5 orders per 10 minutes per client.
 * Uses Upstash sliding window when configured, in-memory otherwise.
 */
export async function checkOrderRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `orders:${ip}`;

  const redisResult = await checkRedisSlidingWindow(
    key,
    ORDER_RATE_LIMIT_MAX,
    ORDER_RATE_LIMIT_WINDOW_MS,
  );
  if (redisResult) return redisResult;

  return checkRateLimit(key, ORDER_RATE_LIMIT_MAX, ORDER_RATE_LIMIT_WINDOW_MS);
}
