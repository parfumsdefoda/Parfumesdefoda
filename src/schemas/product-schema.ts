import { z } from "zod";
import {
  CONCENTRATIONS,
  GENDERS,
  HOUSES,
  PERFORMANCES,
  PRODUCT_TYPES,
  SCENT_FAMILIES,
  SEASONS,
} from "@/lib/product-vocabulary";

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

/**
 * Per-size availability: label + price + boolean inStock (no quantity).
 *
 * `ml` and `sku` are optional and only ever filled by the owner (see
 * docs/Product-Data.md) — an unlabelled size is not invented here.
 */
export const productSizeSchema = z.object({
  label: z.string(),
  price: z.number(),
  inStock: z.boolean(),
  ml: z.number().positive().optional(),
  sku: z.string().optional(),
});

/** Fragrance notes pyramid. */
export const productNotesSchema = z.object({
  top: z.array(z.string()),
  middle: z.array(z.string()),
  base: z.array(z.string()),
});

/**
 * The vocabulary lives in src/lib/product-vocabulary.ts so the filter bar can
 * import five string arrays without pulling zod into the browser bundle. These
 * re-exports keep the schema the single import site for everything else.
 */
export {
  CONCENTRATIONS,
  GENDERS,
  HOUSES,
  PERFORMANCES,
  PRODUCT_TYPES,
  SCENT_FAMILIES,
  SEASONS,
};

export type {
  Concentration,
  Gender,
  House,
  Performance,
  ProductType,
  ScentFamily,
  Season,
} from "@/lib/product-vocabulary";

/** A single product in the catalog. */
export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  description: z.string(),
  image: z.string(),
  /** Extra views. `image` stays the contract — this is optional enrichment. */
  gallery: z.array(z.string()).optional(),
  gender: z.enum(GENDERS),
  type: z.enum(PRODUCT_TYPES),
  house: z.enum(HOUSES),
  oily: z.boolean(),
  fodaOriginal: z.boolean(),
  season: z.enum(SEASONS),
  performance: z.enum(PERFORMANCES),
  featured: z.boolean(),
  badge: z.string(),
  rating: z.number(),
  reviews: z.number(),
  status: z.string(),
  sortOrder: z.number(),
  sizes: z.array(productSizeSchema),
  inStock: z.boolean(),
  notes: productNotesSchema,
  /**
   * Optional enrichment — filled by the owner, absent until then.
   *
   * The notes pyramid stays `top` / `middle` / `base`: that shape predates this
   * phase, AGENTS.md documents it, and every consumer reads `middle`. Renaming
   * it to `heart` would be a data migration with no gain, so it is kept.
   */
  concentration: z.enum(CONCENTRATIONS).optional(),
  family: z.enum(SCENT_FAMILIES).optional(),
  /**
   * `on_site=لا` in the product master. The product stays in the catalogue but
   * every list, search, sitemap and chat recommendation skips it, and its own
   * URL returns 404. Absent means visible.
   */
  hidden: z.boolean().optional(),
  /**
   * The owner's private note (product master `internal_note`). Never rendered;
   * stored only so a CSV round-trip cannot silently drop it.
   */
  internalNote: z.string().optional(),
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
