import { NextResponse } from "next/server";
import { loadVisibleProducts } from "@/services/products";
import { buildSearchIndex } from "@/lib/search-index";

/**
 * The header's search suggestions — names and meta only.
 *
 * Deliberately tiny: the catalogue itself never enters a client bundle or the
 * root layout. The browser fetches this once, on first focus, and filters
 * locally; the route is cached for five minutes (and stale-served while it
 * refreshes), so a popular storefront does not re-read the JSON per visitor.
 *
 * Never includes hidden products, prices, `house` or any field a shopper may
 * not see. The meta line is the PUBLIC tier label (so `دووب` never appears)
 * plus the scent style.
 */
export const revalidate = 300;

export async function GET() {
  const products = await loadVisibleProducts();

  const items = buildSearchIndex(products);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
