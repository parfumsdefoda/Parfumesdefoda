/**
 * Cart and order quantity ceilings.
 *
 * This module deliberately has NO imports. The client cart (badge, quantity
 * stepper, stale-line validation) needs the same numbers as the server-side
 * schemas, and importing them from `schemas/order` pulled zod and the whole
 * checkout contract into the first-load JS of every page.
 */
export const MAX_ITEM_QUANTITY = 20;

/** Maximum number of distinct lines in one order. */
export const MAX_ORDER_LINES = 30;
