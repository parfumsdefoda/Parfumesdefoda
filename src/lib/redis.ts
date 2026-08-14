import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client instance (server-only).
 *
 * Initialized from the standard Vercel KV environment variables via
 * Redis.fromEnv() (KV_REST_API_URL, KV_REST_API_TOKEN, etc.).
 *
 * IMPORTANT: This module must NEVER be imported from a "use client" component
 * (same rule as src/services/*) — it reads process.env at import time and is
 * only meant for server-side code (API routes and Server Components).
 *
 * Error resilience: Redis.fromEnv() only warns (does not throw) when the env
 * vars are missing, so importing this module is always safe. Command-level
 * failures (e.g. Redis unreachable) surface when calling commands, and are
 * handled by the callers in src/lib/sales-tracking.ts.
 */
export const redis = Redis.fromEnv();