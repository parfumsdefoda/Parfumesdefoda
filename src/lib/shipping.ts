import type { FullSettings } from "@/types/services";

/**
 * Flat shipping fee helper — the ONE place the fee is resolved.
 *
 * Source of truth: `data/settings.json` → `shipping.cost`.
 * The owner's rule is a flat fee everywhere: there is NO free-shipping
 * threshold, so the fee never depends on the cart subtotal.
 *
 * Shared by client components (cart drawer, checkout summary, product card)
 * and server code (`POST /api/orders`), so the number a customer sees is
 * always the number the server charges.
 *
 * Client-safe: no node:fs, no server-only imports.
 */
export function getShippingFee(
  settings: Pick<FullSettings, "shipping">,
): number {
  const cost = settings?.shipping?.cost;

  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
    return 0;
  }

  return cost;
}
