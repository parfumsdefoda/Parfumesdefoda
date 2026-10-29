/**
 * Order channel mode — how notifications are delivered for this process.
 *
 * `live` (default) talks to Resend and CallMeBot for real. `log` writes the
 * exact email/WhatsApp payload to `.tmp/order-previews/` and reports success
 * without touching the network; `fail` makes both channels throw so the
 * all-channels-failed path can be exercised.
 *
 * The switch exists for local work and for the test suite: without it there is
 * no way to drive a checkout to the success page on a machine whose `.env`
 * carries the owner's real credentials. It is therefore deliberately refused
 * in production — a deployed store must always reach the owner, and an
 * environment variable must not be able to silence a real order.
 *
 * Pure and client-safe: no fs, no network.
 */

export type OrderChannelMode = "live" | "log" | "fail";

export function resolveOrderChannelMode(
  raw: string | undefined = process.env.ORDER_CHANNELS_MODE,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): OrderChannelMode {
  const value = raw?.trim().toLowerCase();
  if (value !== "log" && value !== "fail") return "live";

  // Never in production, whatever the environment says.
  if (nodeEnv === "production") return "live";

  return value;
}
