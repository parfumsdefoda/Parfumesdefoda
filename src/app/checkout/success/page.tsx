import { loadFullSettings } from "@/services/settings";
import { CheckoutSuccess } from "@/features/checkout/components/checkout-success";

/**
 * Checkout success page — Server Component.
 *
 * Resolves the store WhatsApp number from configuration so the confirmation
 * button can prefill the order number, then renders the client screen.
 *
 * Priority: data/contact.json (the owner-managed source of truth) first, then
 * NEXT_PUBLIC_WHATSAPP_NUMBER as a fallback. A stale placeholder in an env
 * file must never be the number a customer actually messages.
 */
export default async function CheckoutSuccessPage() {
  const settings = await loadFullSettings();

  const whatsappNumber =
    settings.contact.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return <CheckoutSuccess whatsappNumber={whatsappNumber} />;
}
