import type { Product } from "@/types";

/**
 * Search products by query string.
 * Matches against name, brand, description, gender, type, house,
 * season, performance, and notes. Supports both Arabic and English text.
 */
export function searchProducts(
  products: Product[],
  query: string,
): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return products;

  const q = trimmed.toLowerCase();

  return products.filter((product) => {
    const nameMatch = product.name.toLowerCase().includes(q);
    const brandMatch = product.brand.toLowerCase().includes(q);
    const descMatch = product.description.toLowerCase().includes(q);
    const genderMatch = product.gender.toLowerCase().includes(q);
    const typeMatch = product.type.toLowerCase().includes(q);
    const houseMatch = product.house.toLowerCase().includes(q);
    const seasonMatch = product.season.toLowerCase().includes(q);
    const performanceMatch = product.performance.toLowerCase().includes(q);
    const notesMatch = [
      ...(product.notes?.top ?? []),
      ...(product.notes?.middle ?? []),
      ...(product.notes?.base ?? []),
    ].some((note) => note.toLowerCase().includes(q));

    return (
      nameMatch ||
      brandMatch ||
      descMatch ||
      genderMatch ||
      typeMatch ||
      houseMatch ||
      seasonMatch ||
      performanceMatch ||
      notesMatch
    );
  });
}
