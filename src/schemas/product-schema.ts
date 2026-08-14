import { z } from "zod";

/**
 * Product schema — the single source of truth for the product catalog.
 *
 * Matches the shape of data/products.json exactly. The canonical TS types
 * (`Product`, `ProductNotes`, `ProductSize`) are derived from this schema via
 * `z.infer`, and re-exported from `src/types/product.ts`.
 *
 * RULES:
 * - Keep this file in sync with data/products.json. Never edit product fields
 *   without checking here first.
 * - No numeric stock counts — stock is boolean only (`inStock`), per size and
 *   overall. Do NOT add a quantity field.
 */

/** Per-size availability: label + price + boolean inStock (no quantity). */
export const productSizeSchema = z.object({
  label: z.string(),
  price: z.number(),
  inStock: z.boolean(),
});

/** Fragrance notes pyramid. */
export const productNotesSchema = z.object({
  top: z.array(z.string()),
  middle: z.array(z.string()),
  base: z.array(z.string()),
});

/** A single product in the catalog. */
export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  description: z.string(),
  image: z.string(),
  gallery: z.array(z.string()),
  gender: z.enum(["رجالي", "نسائي", "للجنسين"]),
  type: z.enum(["شرقي", "غربي"]),
  house: z.enum(["ديزاينر", "نيش", "دووب"]),
  oily: z.boolean(),
  season: z.enum(["صيفي", "شتوي", "خريفي", "ربيعي"]),
  performance: z.enum(["أداء ضعيف", "أداء متوسط", "أداء قوي", "أداء صاروخي"]),
  featured: z.boolean(),
  badge: z.string(),
  rating: z.number(),
  reviews: z.number(),
  status: z.string(),
  sortOrder: z.number(),
  sizes: z.array(productSizeSchema),
  inStock: z.boolean(),
  notes: productNotesSchema,
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

/** The full catalog — array of products. */
export const productArraySchema = z.array(productSchema);

export type Product = z.infer<typeof productSchema>;
export type ProductNotes = z.infer<typeof productNotesSchema>;
export type ProductSize = z.infer<typeof productSizeSchema>;
