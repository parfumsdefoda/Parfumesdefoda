import type { Product } from "@/types";

/**
 * Normalise Arabic (and Latin) text so search is forgiving about spelling.
 *
 * Arabic shoppers type the same word several ways: with or without hamza,
 * with ة or ه, with ى or ي, with tatweel or diacritics. Normalising both sides
 * of the comparison means "افريكان" finds "أفريكان" and "سجده" finds "سجدة".
 *
 * Folds: tatweel + diacritics removed, أ/إ/آ/ٱ → ا, ة → ه, ى → ي,
 * and Latin text lowercased.
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/\u0640/g, "") // tatweel ـ
    .replace(/[\u064B-\u0655\u0670]/g, "") // harakat, tanween, shadda, superscript alef
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0649/g, "\u064A") // ى → ي
    .toLowerCase();
}

/** The fields a search query is matched against. */
function searchableText(product: Product): string[] {
  return [
    product.name,
    product.brand,
    product.description,
    product.gender,
    product.type,
    product.house,
    product.season ?? "",
    product.performance,
    ...(product.notes?.top ?? []),
    ...(product.notes?.middle ?? []),
    ...(product.notes?.base ?? []),
  ];
}

/**
 * True when one product matches a query.
 *
 * The catalogue's Arabic labels are part of the searchable text, so typing
 * "نيش" finds every niche product without a separate index.
 */
export function productMatchesQuery(product: Product, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const q = normalizeArabic(trimmed);
  return searchableText(product).some((value) => normalizeArabic(value).includes(q));
}

/**
 * Search products by query string.
 * Matches against name, brand, description, gender, type, house,
 * season, performance, and notes. Supports both Arabic and English text,
 * and ignores hamza/taa-marbuta/alef-maqsura/diacritic differences.
 */
export function searchProducts(
  products: Product[],
  query: string,
): Product[] {
  if (!query.trim()) return products;
  return products.filter((product) => productMatchesQuery(product, query));
}
