import { unstable_cache } from "next/cache";

import { readProductSalesCounts } from "@/lib/sales-tracking";

/**
 * Cached product-sales counts (server-only).
 *
 * The homepage asks for these on every request, but the numbers only move when
 * an order completes. Five minutes of staleness is invisible to a shopper and
 * keeps the render off Redis entirely for most requests.
 *
 * The underlying read is already timeout-capped and never throws, so a Redis
 * outage degrades to "default order" instead of a slow or broken page.
 */
export const getProductSalesCounts = unstable_cache(
  async () => readProductSalesCounts(),
  ["product-sales-counts"],
  { revalidate: 300, tags: ["product-sales"] },
);
