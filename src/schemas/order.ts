import { z } from "zod";
import { checkoutSchema } from "./checkout";

/**
 * Order request schema — the SHARED contract between the checkout form and
 * `POST /api/orders`.
 *
 * The server must never trust client-side money: prices, subtotal, shipping
 * and total are recomputed from `data/products.json` + `data/settings.json`.
 * The request therefore only carries the customer details (validated with the
 * exact same `checkoutSchema` the form uses, including the Egyptian phone
 * regex) and the identity of each line (`productId + sizeLabel` + quantity) —
 * the same identity the cart uses.
 *
 * Unknown/extra body fields are stripped, so a client that still sends prices
 * cannot influence anything.
 */

/** Maximum quantity per line — matches the cart's own limit. */
export const MAX_ITEM_QUANTITY = 20;

/** Maximum number of distinct lines in one order. */
export const MAX_ORDER_LINES = 30;

export const orderLineSchema = z.object({
  productId: z.string().min(1),
  sizeLabel: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
});

export const orderRequestSchema = z.object({
  customer: checkoutSchema,
  items: z.array(orderLineSchema).min(1).max(MAX_ORDER_LINES),
  paymentMethod: z.string().min(1).max(50).optional(),
});

export type OrderLineRequest = z.infer<typeof orderLineSchema>;
export type OrderRequest = z.infer<typeof orderRequestSchema>;
