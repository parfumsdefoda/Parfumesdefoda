import { loadFullSettings } from "@/services/settings";
import { CheckoutPageClient } from "@/features/checkout/components/checkout-page";

/**
 * Checkout page — Server Component.
 *
 * Loads settings server-side (for shipping cost)
 * and passes them to the client component which handles the form.
 */
export default async function CheckoutPage() {
  const settings = await loadFullSettings();

  return (
    <CheckoutPageClient
      shipping={settings.shipping}
    />
  );
}
