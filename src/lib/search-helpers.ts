import type { Product } from "@/types";

/**
 * Search products by query string.
 * Matches against name, brand, description, categories, and tags.
 * Supports both Arabic and English text.
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
    const shortDescMatch = product.shortDescription
      ?.toLowerCase()
      .includes(q);
    const categoryMatch = product.categories.some((c) =>
      c.toLowerCase().includes(q),
    );
    const tagMatch = product.tags?.some((t) =>
      t.toLowerCase().includes(q),
    );

    return (
      nameMatch ||
      brandMatch ||
      descMatch ||
      shortDescMatch ||
      categoryMatch ||
      tagMatch
    );
  });
}
