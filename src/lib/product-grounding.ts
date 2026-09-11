/**
 * Product grounding utilities (server-only).
 *
 * Ensures that AI-recommended product codes actually exist in the catalog.
 * Silently drops any hallucinated codes — the frontend never sees invalid ones.
 */

import { readJsonFile } from "@/lib/json-loader";
import { productArraySchema, type Product } from "@/schemas/product-schema";

// ─── Product Context Builder ────────────────────────────────────────────────

/**
 * Build a compact text representation of the product catalog for the AI prompt.
 * Only includes fields relevant for fragrance recommendations.
 */
export function buildProductContext(products: Product[]): string {
  return products
    .filter((p) => p.status === "active")
    .map((p) => {
      const priceRange =
        p.sizes.length > 0
          ? `${Math.min(...p.sizes.map((s) => s.price))}-${Math.max(...p.sizes.map((s) => s.price))}`
          : "غير متوفر";
      const sizes = p.sizes.filter((s) => s.inStock).map((s) => s.label).join("، ");
      const notesStr = [
        p.notes.top.length > 0 ? `قمة: ${p.notes.top.join("، ")}` : "",
        p.notes.middle.length > 0 ? `وسط: ${p.notes.middle.join("، ")}` : "",
        p.notes.base.length > 0 ? `قاعدة: ${p.notes.base.join("، ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return [
        `كود: ${p.id}`,
        `اسم: ${p.name}`,
        `فاخر: ${p.featured ? "نعم ✅ (منتج فاخر — يُقدَّم أولاً عند تساوي الملاءمة)" : "لا"}`,
        `ماركة: ${p.brand}`,
        `نوع: ${p.type}`,
        `الدار: ${p.house}`,
        `جنس: ${p.gender}`,
        `الفصل: ${p.season}`,
        `الأداء: ${p.performance}`,
        `السعر: ${priceRange} ج.م`,
        `الأحجام: ${sizes || "غير متوفر"}`,
        notesStr ? `الروائح: ${notesStr}` : "",
        `وصف: ${p.description}`,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

// ─── Product Validation ─────────────────────────────────────────────────────

/**
 * Validate and filter recommended product codes against the real catalog.
 * Returns only codes that exist in data/products.json — silently drops fakes.
 */
export function validateProductCodes(
  codes: string[],
  validIds: Set<string>,
): string[] {
  return codes.filter((code) => validIds.has(code));
}

/**
 * Deterministic luxury-first ordering backstop (don't rely on the LLM alone).
 *
 * Stable-sorts validated recommendation codes so "فاخر" (featured) products
 * come first, while PRESERVING the model's relative ordering within each
 * group — the LLM's relevance judgment inside each tier is respected.
 */
export function prioritySortCodes(
  codes: string[],
  featuredIds: Set<string>,
): string[] {
  const featured: string[] = [];
  const regular: string[] = [];
  for (const code of codes) {
    (featuredIds.has(code) ? featured : regular).push(code);
  }
  return [...featured, ...regular];
}

// ─── Catalog Loader ─────────────────────────────────────────────────────────

/**
 * Load and parse the full product catalog from disk.
 * Returns both the validated products array and a Set of valid IDs for O(1) lookups.
 */
export async function loadCatalog(): Promise<{
  products: Product[];
  validIds: Set<string>;
}> {
  const raw = await readJsonFile<Product[]>("data/products.json", []);
  const result = productArraySchema.safeParse(raw);

  if (!result.success) {
    console.error("[chat] Product catalog validation failed:", result.error.issues);
    return { products: [], validIds: new Set() };
  }

  const products = result.data;
  const validIds = new Set(products.map((p) => p.id));

  return { products, validIds };
}
