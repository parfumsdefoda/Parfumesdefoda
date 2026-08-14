import type { Product } from "@/types";
import { productArraySchema } from "@/schemas/product-schema";
import { validateProducts } from "@/lib/product-helpers";
import { readJsonFile } from "@/lib/json-loader";

/**
 * Load all products from data/products.json using server-side file reading.
 * Returns only valid products.
 *
 * Handles both formats:
 * - Array of products: `[{...}, {...}]`
 * - Single product object: `{...}` (wrapped in array)
 *
 * Schema protection: in development the loaded data is validated against the
 * Zod product schema (src/schemas/product-schema.ts — the single source of
 * truth). A broken schema throws a clear error naming the failing product and
 * field instead of silently cascading into "0 products". Production validates
 * too but tolerates unknown shapes by falling back to the structural checker.
 */
export async function loadProducts(): Promise<Product[]> {
  const data = await readJsonFile<unknown>("data/products.json", []);

  // Handle single product object (wrap in array)
  const list = data && typeof data === "object" && !Array.isArray(data)
    ? [data]
    : Array.isArray(data)
      ? data
      : [];

  if (process.env.NODE_ENV === "development") {
    const result = productArraySchema.safeParse(list);
    if (!result.success) {
      const first = result.error.issues[0];
      const productIndex =
        typeof first?.path[0] === "number" ? first.path[0] : undefined;
      const rawProduct =
        productIndex !== undefined ? list[productIndex] : undefined;
      const productId =
        rawProduct && typeof rawProduct === "object" && "id" in rawProduct
          ? (rawProduct as { id: unknown }).id
          : undefined;

      const location = productId
        ? `product "${String(productId)}"`
        : productIndex !== undefined
          ? `products[${productIndex}]`
          : "products";
      const field = first?.path.length ? first.path.join(".") : "(root)";

      throw new Error(
        `[product-schema] Invalid ${location}: field "${field}" — ${first?.message ?? "schema violation"}. ` +
          `Fix data/products.json or update src/schemas/product-schema.ts.`,
      );
    }
    return result.data;
  }

  return validateProducts(list);
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
