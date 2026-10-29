import type { Metadata } from "next";
import { loadFullSettings } from "@/services/settings";
import { loadVisibleProducts } from "@/services/products";
import type { CartCatalogProduct } from "@/lib/cart-utils";
import { CheckoutPageClient } from "@/features/checkout/components/checkout-page";

/**
 * Checkout page — Server Component.
 *
 * Loads settings server-side (for shipping cost)
 * and passes them to the client component which handles the form.
 */
export const metadata: Metadata = {
  title: "إتمام الطلب",
  // A checkout form is not a landing page: without this the route inherited the
  // root metadata and was opened to search engines.
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [settings, products] = await Promise.all([loadFullSettings(), loadVisibleProducts()]);
  const catalogue: CartCatalogProduct[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    status: product.status,
    inStock: product.inStock,
    sizes: product.sizes.map(({ label, price, inStock }) => ({ label, price, inStock })),
  }));

  return <CheckoutPageClient shipping={settings.shipping} catalogue={catalogue} />;
}
