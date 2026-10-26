import { z } from "zod";

/**
 * Settings schema — the single source of truth for data/settings.json.
 *
 * RULES:
 * - Shipping is a FLAT fee everywhere. There is no free-shipping threshold,
 *   so `shipping` only carries `cost`. Never re-introduce `freeAbove`.
 * - Keep this file in sync with data/settings.json (validated by
 *   `npm run validate-json`).
 */

export const shippingConfigSchema = z
  .object({
    /** Flat shipping fee in the store currency (EGP). */
    cost: z.number().min(0),
  })
  // Strict: a legacy `freeAbove` (or any unknown shipping key) must fail
  // validation instead of being silently stripped.
  .strict();

export const storeConfigSchema = z.object({
  name: z.string(),
  website: z.string(),
  currency: z.string(),
  language: z.string(),
  direction: z.string(),
});

export const gridConfigSchema = z.object({
  desktop: z.number().int().min(1),
  tablet: z.number().int().min(1),
  mobile: z.number().int().min(1),
});

export const settingsSchema = z.object({
  store: storeConfigSchema,
  grid: gridConfigSchema,
  shipping: shippingConfigSchema,
  /**
   * Optional: product slugs for the homepage hero, in order. Omitted or empty
   * means the hero picks its own three (see src/lib/hero-products.ts).
   */
  heroProducts: z.array(z.string().min(1)).optional(),
});

export type ShippingConfig = z.infer<typeof shippingConfigSchema>;
export type SettingsFile = z.infer<typeof settingsSchema>;
