"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useCart } from "@/providers/CartProvider";
import { CartDrawer } from "./cart-drawer";
import { resolveCartLines, type CartCatalogProduct } from "@/lib/cart-utils";

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
  viewCart: string;
  subtotal: string;
  shipping: string;
  grandTotal: string;
  resolveIssues: string;
  issues: {
    "product-unavailable": string;
    "size-unavailable": string;
    "price-changed": string;
    "invalid-quantity": string;
  };
}

export interface CartShellProps {
  labels: CartShellLabels;
  /** Flat fee from data/settings.json, resolved by the root layout. */
  shippingFee: number;
  catalogue: CartCatalogProduct[];
}

/**
 * CartShell — the cart drawer, mounted once for the whole site.
 *
 * It used to be mounted by the homepage and the product page only, which meant
 * a quick add on `/shop` or a category page opened a drawer that did not exist.
 * The root layout owns it now, so the cart behaves the same on every route.
 */
export function CartShell({ labels, shippingFee, catalogue }: CartShellProps) {
  const cart = useCart();
  const router = useRouter();

  const items = useMemo(
    () => resolveCartLines(cart.items, catalogue),
    [cart.items, catalogue],
  );

  return (
    <CartDrawer
      open={cart.isDrawerOpen}
      onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}
      items={items}
      title={labels.title}
      emptyTitle={labels.empty}
      emptyDescription={labels.emptyDescription}
      checkoutLabel={labels.checkout}
      removeLabel={labels.remove}
      quantityLabel={labels.quantity}
      itemsCountLabel={labels.itemsCount}
      continueShoppingLabel={labels.continueShopping}
      viewCartLabel={labels.viewCart}
      lineLabels={{ quantity: labels.quantity, remove: labels.remove, issues: labels.issues }}
      shippingFee={shippingFee}
      resolveIssuesLabel={labels.resolveIssues}
      totalsLabels={{ subtotal: labels.subtotal, shipping: labels.shipping, total: labels.grandTotal }}
      checkoutDisabled={items.some((line) => line.issue !== null)}
      onUpdateQuantity={cart.updateQuantity}
      onRemoveItem={cart.removeItem}
      onCheckout={() => {
        if (items.some((line) => line.issue !== null)) return;
        cart.closeDrawer();
        router.push("/checkout");
      }}
    />
  );
}
