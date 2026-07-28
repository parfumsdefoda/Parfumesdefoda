/**
 * Cart service.
 *
 * Provides cart-related utility functions.
 * The main cart state is managed by CartProvider (src/providers/CartProvider.tsx).
 * This service handles external operations like generating order messages.
 *
 * Note: calculateTotal and getItemCount live in services/orders.ts
 * to avoid duplication. Import from there if needed.
 */

// Re-export for backward compatibility
export { calculateTotal, getItemCount } from "./orders";
