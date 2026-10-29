"use client";

/**
 * Advisor greeting — one line, once per browser session.
 *
 * An external store instead of component state so the launcher, the panel and
 * any future trigger agree, and so the server snapshot is always `false`
 * (no hydration mismatch). sessionStorage is read lazily and cached: a
 * snapshot function must be cheap and stable, not hit storage on every render.
 */

const STORAGE_KEY = "pdf-advisor-greeting-seen";

let visible = false;
let resolved = false;
let seen = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function hasBeenSeen(): boolean {
  if (!resolved) {
    resolved = true;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private mode / storage disabled: treat it as seen rather than nagging.
      seen = true;
    }
  }
  return seen;
}

export function subscribeGreeting(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function greetingSnapshot(): boolean {
  return visible;
}

/** The server and the first client render agree: nothing is shown yet. */
export function greetingServerSnapshot(): boolean {
  return false;
}

/** Show the greeting once per session. Returns false when already seen. */
export function showGreetingOnce(): boolean {
  if (visible || hasBeenSeen()) return false;
  resolved = true;
  seen = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // The in-memory flag still prevents a second appearance this session.
  }
  visible = true;
  emit();
  return true;
}

export function dismissGreeting(): void {
  if (!visible) return;
  visible = false;
  emit();
}
