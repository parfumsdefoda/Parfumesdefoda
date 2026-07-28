import type { Product } from "@/types";

/**
 * Validate that a product has all required fields and valid data.
 */
export function isValidProduct(product: unknown): product is Product {
  if (typeof product !== "object" || product === null) return false;
  const p = product as Record<string, unknown>;

  if (typeof p.id !== "string" || !p.id) return false;
  if (typeof p.slug !== "string" || !p.slug) return false;
  if (typeof p.name !== "string" || !p.name) return false;
  if (typeof p.brand !== "string") return false;
  if (typeof p.description !== "string") return false;
  if (typeof p.gender !== "string") return false;
  if (!Array.isArray(p.categories)) return false;
  if (typeof p.image !== "string") return false;
  if (typeof p.stock !== "number") return false;
  if (!Array.isArray(p.sizes)) return false;

  // Validate sizes
  for (const size of p.sizes) {
    if (typeof size !== "object" || size === null) return false;
    const s = size as Record<string, unknown>;
    if (typeof s.label !== "string") return false;
    if (typeof s.price !== "number") return false;
  }

  return true;
}

/**
 * Filter out invalid products from an array.
 */
export function validateProducts(products: unknown[]): Product[] {
  return products.filter(isValidProduct);
}

/**
 * Check if a product is in stock for a given size.
 */
export function isProductInStock(
  product: Product,
  sizeLabel?: string,
): boolean {
  if (sizeLabel) {
    const size = product.sizes.find((s) => s.label === sizeLabel);
    if (size?.stock !== undefined) return size.stock > 0;
  }
  return product.stock > 0;
}

/**
 * Get a product by ID from an array.
 */
export function findProductById(
  products: Product[],
  id: string,
): Product | undefined {
  return products.find((p) => p.id === id);
}

/**
 * Get a product by slug from an array.
 */
export function findProductBySlug(
  products: Product[],
  slug: string,
): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/**
 * Get featured products.
 */
export function getFeaturedProducts(products: Product[]): Product[] {
  return products.filter((p) => p.featured);
}
