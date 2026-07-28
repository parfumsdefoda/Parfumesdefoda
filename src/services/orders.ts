import type { CartItem } from "@/providers/CartProvider";

/**
 * Calculate total price for cart items.
 */
export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Get total item count in cart.
 */
export function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
