"use client";

/**
 * Advisor bus — one tiny channel for "open the perfume advisor".
 *
 * Three places invite the shopper into the advisor (the header button, the hero
 * link and the homepage band) and one component renders it. Passing a callback
 * down from a Server Component layout through every route would mean a context
 * in the root tree just for this; a module-level listener set keeps the entry
 * points as plain client buttons and the panel the only subscriber.
 *
 * Client-only by construction: importing it from a Server Component is a
 * mistake the module guards against at runtime.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Ask whoever renders the advisor to open it. */
export function openAdvisor(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to open requests. Returns the unsubscribe function. */
export function subscribeAdvisor(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
