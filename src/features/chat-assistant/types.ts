/**
 * Chat assistant types — client-safe (no server-only imports).
 */

/** A single message in the conversation */
export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Products recommended by the AI (only on assistant messages) */
  products?: ChatProduct[];
  /** Timestamp */
  timestamp: number;
}

/** Product shape needed by the compact chat card (subset of full Product) */
export interface ChatProduct {
  id: string;
  /** URL slug for linking to the product detail page */
  slug: string;
  name: string;
  brand: string;
  image: string;
  type: "شرقي" | "غربي";
  gender: "رجالي" | "نسائي" | "للجنسين";
  house: string;
  season: string;
  performance: string;
  sizes: { label: string; price: number; inStock: boolean }[];
}

/** API response shape from POST /api/chat */
export interface ChatApiResponse {
  reply: string;
  recommended_product_codes: string[];
  /** Full details of the recommended products (resolved server-side) */
  products?: ChatProduct[];
  error?: string;
}