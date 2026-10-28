#!/usr/bin/env node
/**
 * Export `data/products.json` into the owner's master spreadsheet.
 *
 * Writes `data/product-master.csv` (UTF-8 with BOM so Excel opens the Arabic),
 * plus `data/product-master-status.md`. Every known value is pre-filled;
 * anything the catalogue does not know stays EMPTY — this script never guesses.
 *
 * Because this file is the owner's working document, it refuses to overwrite a
 * version that holds cells not yet imported. Use --force after importing
 * (or after copying the file somewhere safe).
 *
 * Usage:
 *   npm run master:export
 *   npm run master:export -- --force
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCsv,
  catalogueSizes,
  masterColumnsFor,
  masterCsvRows,
  parseMasterFile,
  planMasterImport,
  renderMasterStatusMarkdown,
  summariseMasterStatus,
} from "../src/lib/product-master.ts";
import { productArraySchema } from "../src/schemas/product-schema.ts";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const CSV_PATH = path.join(ROOT, "data", "product-master.csv");
const STATUS_PATH = path.join(ROOT, "data", "product-master-status.md");

const force = process.argv.includes("--force");

async function main() {
  const raw = await readFile(PRODUCTS_PATH, "utf8");
  const parsed = productArraySchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("❌ data/products.json does not match the schema — fix it first.");
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const products = parsed.data;
  const csv = `\uFEFF${buildCsv(masterCsvRows(products))}`;

  let previous = null;
  try {
    previous = await readFile(CSV_PATH, "utf8");
  } catch {
    previous = null;
  }

  if (previous !== null && previous !== csv && !force) {
    // Does the existing file hold work the catalogue has not seen yet?
    const plan = planMasterImport(products, previous, { mode: "dry-run" });
    const pending = plan.changes.length + plan.creations.length;

    console.error("❌ data/product-master.csv موجود ويختلف عن الكتالوج / would be overwritten.");
    console.error(`   pending differences: ${pending} change(s), ${plan.refusals.length} row(s) not importable.`);
    console.error("   Run `npm run master:import` first, or `npm run master:export -- --force` to overwrite.");
    process.exit(1);
  }

  await writeFile(CSV_PATH, csv, "utf8");
  await writeFile(
    STATUS_PATH,
    renderMasterStatusMarkdown(products, new Date().toISOString().slice(0, 10)),
    "utf8",
  );

  const sizes = catalogueSizes(products);
  console.log(
    `✅ Wrote ${products.length} rows × ${masterColumnsFor(sizes).length} columns (sizes: ${sizes.join("/")} مل) → data/product-master.csv`,
  );
  console.log("✅ Wrote data/product-master-status.md");
  console.log("");
  console.log("الحقول الناقصة / Gaps:");
  for (const row of summariseMasterStatus(products)) {
    console.log(`  ${row.field.padEnd(34)} ${row.filled}/${row.total}`);
  }
  console.log("");
  console.log("افتح الملف في Excel، املأ الخلايا الفارغة، ثم:");
  console.log("  npm run master:import                             # معاينة (dry run)");
  console.log("  npm run master:import -- --apply                  # تصنيف + إثراء");
  console.log("  npm run master:import -- --apply --sync-commerce  # + أسعار ومخزون وأسماء");
}

main().catch((error) => {
  console.error("❌ Export failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
