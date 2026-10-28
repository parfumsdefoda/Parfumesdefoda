import type { Metadata } from "next";
import { loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { CartPageClient } from "@/features/cart/components/cart-page";
import type { CartCatalogProduct } from "@/lib/cart-utils";

export const metadata: Metadata = {
  title: "سلة التسوق",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const [products, settings] = await Promise.all([
    loadVisibleProducts(),
    loadFullSettings(),
  ]);
  const catalogue: CartCatalogProduct[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    status: product.status,
    inStock: product.inStock,
    sizes: product.sizes.map(({ label, price, inStock }) => ({ label, price, inStock })),
  }));

  return <CartPageClient catalogue={catalogue} shipping={settings.shipping} />;
}
