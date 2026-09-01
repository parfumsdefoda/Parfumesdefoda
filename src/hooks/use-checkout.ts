"use client";

import { useCallback, useState } from "react";
import { useCart as useCartContext } from "@/providers/CartProvider";
import { generateOrderNumber } from "@/lib/order-number";
import type { CheckoutFormData } from "@/schemas/checkout";

export interface UseCheckoutReturn {
  /** Whether checkout form is visible */
  showCheckout: boolean;
  /** Show the checkout form */
  openCheckout: () => void;
  /** Hide the checkout form */
  closeCheckout: () => void;
  /** Submit order (creates order object and calls API) */
  handleSubmit: (data: CheckoutFormData) => void;
  /** Whether order was submitted */
  isSubmitted: boolean;
  /** Reset checkout state */
  reset: () => void;
}

/**
 * Hook for checkout logic.
 * Handles form submission and order generation.
 */
export function useCheckout(): UseCheckoutReturn {
  const cart = useCartContext();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const openCheckout = useCallback(() => setShowCheckout(true), []);
  const closeCheckout = useCallback(() => setShowCheckout(false), []);

  const handleSubmit = useCallback(
    async (data: CheckoutFormData) => {
      if (cart.items.length === 0) return;

      const orderNumber = generateOrderNumber();

      // Build order object
      const order = {
        orderNumber,
        customer: {
          name: data.name,
          phone: data.phone,
          governorate: data.governorate,
          city: data.city,
          addressDetails: data.addressDetails,
        },
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sizeLabel: item.sizeLabel,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        subtotal: cart.totalPrice,
        shippingCost: 0,
        total: cart.totalPrice,
        paymentMethod: "الدفع عند الاستلام",
        createdAt: new Date().toISOString(),
      };

      try {
        // Submit order to API
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order),
        });

        if (!response.ok) {
          throw new Error("Failed to submit order");
        }

        setIsSubmitted(true);
      } catch {
        // If API fails, still mark as submitted
        setIsSubmitted(true);
      }
    },
    [cart.items, cart.totalPrice],
  );

  const reset = useCallback(() => {
    setIsSubmitted(false);
    setShowCheckout(false);
    cart.clearCart();
  }, [cart]);

  return {
    showCheckout,
    openCheckout,
    closeCheckout,
    handleSubmit,
    isSubmitted,
    reset,
  };
}
