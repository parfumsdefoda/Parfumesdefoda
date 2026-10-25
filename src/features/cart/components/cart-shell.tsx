"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useCart } from "@/providers/CartProvider";
import { CartDrawer } from "./cart-drawer";

export interface CartShellLabels {
  title: string;
  empty: string;
  emptyDescription: string;
  total: string;
  checkout: string;
  remove: string;
  quantity: string;
  itemsCount: string;
  continueShopping: string;
}

export interface CartShellProps {
  labels: CartShellLabels;
  /** Flat fee from data/settings.json, resolved by the root layout. */
  shippingFee: number;
}

/**
 * CartShell — the cart drawer, mounted once for the whole site.
 *
 * It used to be mounted by the homepage and the product page only, which meant
 * a quick add on `/shop` or a category page opened a drawer that did not exist.
 * The root layout owns it now, so the cart behaves the same on every route.
 */
export function CartShell({ labels, shippingFee }: CartShellProps) {
  const cart = useCart();
  const router = useRouter();

  const items = useMemo(
    () =>
      cart.items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        sizeLabel: item.sizeLabel,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
        image: item.image,
      })),
    [cart.items],
  );

  return (
    <CartDrawer
      open={cart.isDrawerOpen}
      onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}
      items={items}
      title={labels.title}
      emptyTitle={labels.empty}
      emptyDescription={labels.emptyDescription}
      totalLabel={labels.total}
      checkoutLabel={labels.checkout}
      removeLabel={labels.remove}
      quantityLabel={labels.quantity}
      itemsCountLabel={labels.itemsCount}
      continueShoppingLabel={labels.continueShopping}
      shippingFee={shippingFee}
      onUpdateQuantity={cart.updateQuantity}
      onRemoveItem={cart.removeItem}
      onCheckout={() => {
        cart.closeDrawer();
        router.push("/checkout");
      }}
    />
  );
}
