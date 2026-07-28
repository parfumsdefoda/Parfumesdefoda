import type { Product } from "@/types";
import { validateProducts } from "@/lib/product-helpers";
import { readJsonFile } from "@/lib/json-loader";

/**
 * Load all products from data/products.json using server-side file reading.
 * Returns only valid products.
 *
 * Handles both formats:
 * - Array of products: `[{...}, {...}]`
 * - Single product object: `{...}` (wrapped in array)
 */
export async function loadProducts(): Promise<Product[]> {
  const data = await readJsonFile<unknown>("data/products.json", []);

  // Handle single product object (wrap in array)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return validateProducts([data]);
  }

  if (!Array.isArray(data)) return [];
  return validateProducts(data);
}

/**
 * Load products and return them with an error state.
 */
export async function loadProductsWithState(): Promise<{
  products: Product[];
  error: string | null;
}> {
  try {
    const products = await loadProducts();
    if (products.length === 0) {
      return { products: [], error: "فشل تحميل المنتجات" };
    }
    return { products, error: null };
  } catch {
    return { products: [], error: "عذراً، حدث خطأ في تحميل البيانات" };
  }
}
