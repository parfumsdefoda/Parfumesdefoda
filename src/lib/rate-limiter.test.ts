import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkOrderRateLimit,
  checkRateLimit,
  ORDER_RATE_LIMIT_MAX,
  ORDER_RATE_LIMIT_WINDOW_MS,
  type RateLimitResult,
} from "./rate-limiter";

// Force the in-memory fallback so the suite never touches the network.
const envKeys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of envKeys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function uniqueIp(): string {
  return `10.0.0.${Math.floor(Math.random() * 250)}:${Date.now()}`;
}

describe("checkRateLimit (in-memory)", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test:${Math.random()}`;
    const results: RateLimitResult[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(checkRateLimit(key, 3, 60_000));
    }
    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(true);
    expect(results[2].allowed).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[3].retryAfterMs).toBeGreaterThan(0);
  });
});

describe("checkOrderRateLimit", () => {
  it("defaults to 5 orders per 10 minutes", () => {
    expect(ORDER_RATE_LIMIT_MAX).toBe(5);
    expect(ORDER_RATE_LIMIT_WINDOW_MS).toBe(10 * 60 * 1000);
  });

  it("allows the first 5 orders from an IP and blocks the 6th", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i++) {
      const result = await checkOrderRateLimit(ip);
      expect(result.allowed, `attempt ${i + 1}`).toBe(true);
    }

    const blocked = await checkOrderRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks IPs independently", async () => {
    const first = uniqueIp();
    const second = uniqueIp();

    for (let i = 0; i < 6; i++) await checkOrderRateLimit(first);

    expect((await checkOrderRateLimit(first)).allowed).toBe(false);
    expect((await checkOrderRateLimit(second)).allowed).toBe(true);
  });
});
