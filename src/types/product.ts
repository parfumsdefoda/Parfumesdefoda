/**
 * Product types — single source of truth is src/schemas/product-schema.ts.
 *
 * These types are derived via `z.infer` from the Zod schema so the TS type
 * can never drift from the runtime validator. Do NOT redefine Product here.
 */
export type { Product, ProductNotes, ProductSize } from "@/schemas/product-schema";
