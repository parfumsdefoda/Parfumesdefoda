/**
 * Order delivery bookkeeping.
 *
 * An order is "delivered" when at least one channel accepted it: the owner's
 * email, the owner's WhatsApp, or (optionally) the Redis order store.
 *
 * In production, an order that reached NO channel must fail loudly with a 503
 * so the customer keeps their cart and retries. In development nothing is
 * configured, so an order is still accepted.
 */

export interface DeliveryOutcome {
  email: boolean;
  whatsapp: boolean;
  store: boolean;
}

/** Arabic message returned to the customer when every channel failed. */
export const ALL_CHANNELS_FAILED_MESSAGE =
  "مش قادرين نستلم طلبك دلوقتي. من فضلك جرّب تاني بعد شوية — سلة التسوق لسه محفوظة عندك.";

export function isOrderAccepted(
  outcome: DeliveryOutcome,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (outcome.email || outcome.whatsapp || outcome.store) return true;

  // Nothing is configured in development — do not block local testing.
  return nodeEnv !== "production";
}

/**
 * Resolve a promise, falling back to `fallback` if it takes longer than
 * `ms` milliseconds. The returned promise never rejects because of the timer,
 * and the timer is always cleared.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
