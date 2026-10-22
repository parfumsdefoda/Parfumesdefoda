#!/usr/bin/env node
/**
 * Export the catalogue's optional facts into an Excel-friendly CSV.
 *
 * The owner fills the empty cells and runs `npm run enrich:import`. Existing
 * known values are pre-filled; anything the catalogue does not know stays
 * EMPTY — this script never guesses.
 *
 * Run through tsx (see package.json) because it imports the TypeScript schema
 * and merge module.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CELL_SEPARATOR,
  ENRICHMENT_COLUMNS,
  buildCsv,
  renderCompletenessMarkdown,
  summariseCompleteness,
} from "../src/lib/product-enrichment.ts";
import { productArraySchema } from "../src/schemas/product-schema.ts";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const CSV_PATH = path.join(ROOT, "data", "product-enrichment.csv");
const STATUS_PATH = path.join(ROOT, "data", "product-enrichment-status.md");

const sizesWithMl = (product) =>
  product.sizes
    .filter((size) => typeof size.ml === "number")
    .map((size) => `${size.label}=${size.ml}`)
    .join(CELL_SEPARATOR);

const extraViews = (product) =>
  (product.gallery ?? [])
    .filter((image) => image !== product.image)
    .join(CELL_SEPARATOR);

async function main() {
  const raw = await readFile(PRODUCTS_PATH, "utf8");
  const parsed = productArraySchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("❌ data/products.json does not match the schema — fix it first.");
    for (const issue of parsed.error.issues) {
      console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const products = parsed.data;

  const rows = [
    [...ENRICHMENT_COLUMNS],
    ...products.map((product) => [
      product.slug,
      product.name,
      product.concentration ?? "",
      product.family ?? "",
      product.notes.top.join(CELL_SEPARATOR),
      product.notes.middle.join(CELL_SEPARATOR),
      product.notes.base.join(CELL_SEPARATOR),
      sizesWithMl(product),
      extraViews(product),
    ]),
  ];

  // UTF-8 BOM so Excel opens the Arabic columns correctly.
  await writeFile(CSV_PATH, `\uFEFF${buildCsv(rows)}`, "utf8");

  const completeness = summariseCompleteness(products);
  await writeFile(
    STATUS_PATH,
    renderCompletenessMarkdown(products, new Date().toISOString().slice(0, 10)),
    "utf8",
  );

  console.log(`✅ Wrote ${products.length} rows → data/product-enrichment.csv`);
  console.log(`✅ Wrote data/product-enrichment-status.md`);
  console.log("");
  console.log("الحقول الناقصة / Gaps:");
  for (const row of completeness) {
    console.log(`  ${row.field.padEnd(34)} ${row.filled}/${row.total}`);
  }
  console.log("");
  console.log("افتح الملف في Excel، املأ الخلايا الفارغة، ثم:");
  console.log("  npm run enrich:import -- --dry-run   # معاينة");
  console.log("  npm run enrich:import                # تطبيق");
}

main().catch((error) => {
  console.error("❌ Export failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
