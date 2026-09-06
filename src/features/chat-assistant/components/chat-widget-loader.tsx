import { loadProducts } from "@/services/products";
import { ChatWidget } from "./chat-widget";
import type { ChatProduct } from "../types";

/**
 * ChatWidgetLoader — Server Component that loads the product catalog
 * and renders the client-side ChatWidget.
 *
 * This follows the project pattern: Server Components load data via fs-based
 * services, then pass it as props to Client Components.
 */
export async function ChatWidgetLoader() {
  const products = await loadProducts();

  // Map to the lightweight shape the chat widget needs
  const chatProducts: ChatProduct[] = products
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      image: p.image,
      type: p.type,
      gender: p.gender,
      house: p.house,
      season: p.season,
      performance: p.performance,
      sizes: p.sizes,
    }));

  return <ChatWidget products={chatProducts} />;
}
