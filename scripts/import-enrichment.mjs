#!/usr/bin/env node
/**
 * Import the owner-filled enrichment CSV into `data/products.json`.
 *
 * Safety rules:
 *   - every cell is validated (enums, size labels, positive volumes, image
 *     paths); invalid cells are rejected with a reason and left untouched;
 *   - an already-filled value is only replaced with `--force`;
 *   - the merged catalogue must pass the Zod schema before anything is written;
 *   - `--dry-run` prints the diff without touching a file.
 *
 * Usage:
 *   npm run enrich:import -- --dry-run
 *   npm run enrich:import -- --force
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  applyEnrichment,
  parseCsv,
  renderCompletenessMarkdown,
  rowFromCells,
  summariseCompleteness,
} from "../src/lib/product-enrichment.ts";
import { productArraySchema } from "../src/schemas/product-schema.ts";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const STATUS_PATH = path.join(ROOT, "data", "product-enrichment-status.md");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const fileArg = args.find((arg) => arg.startsWith("--file="));
const csvPath = path.resolve(ROOT, fileArg ? fileArg.slice("--file=".length) : "data/product-enrichment.csv");

function report(changes) {
  if (changes.length === 0) {
    console.log("لا تغييرات / No changes.");
    return;
  }

  const perField = new Map();
  for (const change of changes) {
    const key = change.field.replace(/^sizes\..*\.ml$/, "sizes.*.ml");
    perField.set(key, (perField.get(key) ?? 0) + 1);
  }
  const products = new Set(changes.map((change) => change.slug));

  console.log(`التغييرات / Changes: ${changes.length} across ${products.size} product(s)`);
  for (const [field, count] of perField) {
    console.log(`  ${field.padEnd(24)} ${count}`);
  }
  console.log("");
  for (const change of changes) {
    console.log(`  ${change.slug}  ${change.field}: "${change.from}" → "${change.to}"`);
  }
}

function reportRejections(rejections) {
  if (rejections.length === 0) return;
  console.error("");
  console.error(`⚠ خلايا مرفوضة / Rejected cells: ${rejections.length}`);
  for (const rejection of rejections) {
    const where = rejection.slug ? `${rejection.slug}.${rejection.column}` : rejection.column;
    console.error(`  ${where}: "${rejection.value}" — ${rejection.reason}`);
  }
}

async function main() {
  let csv;
  try {
    csv = await readFile(csvPath, "utf8");
  } catch {
    console.error(`❌ لم أجد الملف / CSV not found: ${path.relative(ROOT, csvPath)}`);
    console.error("   npm run enrich:export   # أنشئه أولاً");
    process.exit(1);
  }

  const { header, rows } = parseCsv(csv);
  if (!header.includes("slug")) {
    console.error('❌ The CSV has no "slug" column — re-run npm run enrich:export.');
    process.exit(1);
  }

  const raw = await readFile(PRODUCTS_PATH, "utf8");
  const parsed = productArraySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("❌ data/products.json does not match the schema — fix it first.");
    process.exit(1);
  }

  const result = applyEnrichment(
    parsed.data,
    rows.map((cells) => rowFromCells(header, cells)),
    { force },
  );

  report(result.changes);
  reportRejections(result.rejections);

  if (result.unknownSlugs.length > 0) {
    console.error("");
    console.error(`⚠ صفوف بمعرّف غير موجود / Unknown slugs: ${result.unknownSlugs.join(", ")}`);
  }

  if (dryRun) {
    console.log("");
    console.log("🔍 معاينة فقط — لم يُكتب أي ملف / dry run, nothing written.");
  } else if (result.changes.length > 0) {
    const merged = productArraySchema.safeParse(result.products);
    if (!merged.success) {
      console.error("❌ The merged catalogue would not validate — nothing written.");
      for (const issue of merged.error.issues) {
        console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      process.exit(1);
    }

    await writeFile(PRODUCTS_PATH, `${JSON.stringify(result.products, null, 2)}\n`, "utf8");
    console.log("");
    console.log("✅ كُتب data/products.json / written.");
  } else {
    console.log("");
    console.log("لا تغييرات — لم يُعد كتابة products.json / products.json untouched.");
  }

  const completenessSource = dryRun ? parsed.data : result.products;
  if (!dryRun) {
    await writeFile(
      STATUS_PATH,
      renderCompletenessMarkdown(completenessSource, new Date().toISOString().slice(0, 10)),
      "utf8",
    );
  }

  for (const row of summariseCompleteness(completenessSource)) {
    console.log(`  ${row.field.padEnd(34)} ${row.filled}/${row.total}`);
  }

  const failed = result.rejections.length > 0 || result.unknownSlugs.length > 0;
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
