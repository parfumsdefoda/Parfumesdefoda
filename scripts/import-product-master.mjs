#!/usr/bin/env node
/**
 * Import `data/product-master.csv` into `data/products.json`.
 *
 * Modes (nothing is written unless you ask):
 *   (default)         --dry-run: print every change, grouped, and write nothing
 *   --apply           classification + enrichment fields only
 *   --sync-commerce   also prices, per-size availability, names and descriptions
 *   --create-missing  allow brand-new products (strictly validated)
 *
 * Safety:
 *   - every cell is validated; bad cells are rejected with the line number and
 *     a reason, and leave the product untouched;
 *   - an empty cell never clears a value;
 *   - the merged catalogue is re-validated against the Zod schema before write.
 *
 * Usage:
 *   npm run master:import
 *   npm run master:import -- --apply
 *   npm run master:import -- --apply --sync-commerce
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  planMasterImport,
  renderMasterStatusMarkdown,
  summariseMasterStatus,
} from "../src/lib/product-master.ts";
import { productArraySchema } from "../src/schemas/product-schema.ts";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const STATUS_PATH = path.join(ROOT, "data", "product-master-status.md");
const DEFAULT_CSV = "data/product-master.csv";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const syncCommerce = args.includes("--sync-commerce");
const createMissing = args.includes("--create-missing");
const fileArg = args.find((arg) => arg.startsWith("--file="));
const csvPath = path.resolve(ROOT, fileArg ? fileArg.slice("--file=".length) : DEFAULT_CSV);

const mode = syncCommerce ? "sync-commerce" : apply ? "apply" : "dry-run";

const GROUP_LABELS = {
  classification: "التصنيف / classification",
  enrichment: "الإثراء / enrichment",
  commerce: "البيع / commerce (prices, availability, names)",
};

/** `sizes.50 مل.ml` — read from the label, never typed, so it is summarised. */
const isDerivedMl = (change) => /\.ml$/.test(change.field);

/** @param {import("../src/lib/product-master.ts").MasterChange[]} changes */
function printChanges(changes) {
  if (changes.length === 0) {
    console.log("لا تغييرات / No changes.");
    return;
  }

  for (const group of ["classification", "enrichment", "commerce"]) {
    const inGroup = changes.filter((change) => change.group === group);
    if (inGroup.length === 0) continue;

    const derivedMl = inGroup.filter(isDerivedMl);
    const listed = inGroup.filter((change) => !isDerivedMl(change));

    /** @type {Map<string, number>} */
    const perField = new Map();
    for (const change of listed) {
      perField.set(change.field, (perField.get(change.field) ?? 0) + 1);
    }

    console.log(`\n── ${GROUP_LABELS[group]} — ${listed.length} change(s)`);
    for (const [field, count] of [...perField].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${field.padEnd(30)} ${count}`);
    }
    if (derivedMl.length > 0) {
      console.log(`   ${'sizes.*.ml'.padEnd(30)} ${derivedMl.length}  (derived from the size labels, no CSV cell)`);
    }
    console.log("");
    for (const change of listed) {
      console.log(`   ${change.slug}  ${change.field}: "${change.from}" → "${change.to}"`);
    }
  }
}

async function main() {
  let csv;
  try {
    csv = await readFile(csvPath, "utf8");
  } catch {
    console.error(`❌ لم أجد الملف / CSV not found: ${path.relative(ROOT, csvPath)}`);
    console.error("   npm run master:export   # أنشئه من data/products.json");
    process.exit(1);
  }

  const raw = await readFile(PRODUCTS_PATH, "utf8");
  const parsed = productArraySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("❌ data/products.json does not match the schema — fix it first.");
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const plan = planMasterImport(parsed.data, csv, {
    mode,
    createMissing,
    imageExists: (imagePath) =>
      existsSync(path.join(ROOT, "public", imagePath.replace(/^\//, ""))),
  });

  console.log(`\n═══ product-master → products.json (${mode}) ═══`);
  const ownerChanges = plan.changes.filter((change) => !isDerivedMl(change));
  console.log(
    `rows read ${plan.rows} · skipped ${plan.skipped} · changed rows ${new Set(ownerChanges.map((c) => c.slug)).size}`,
  );

  printChanges(plan.changes);

  if (plan.creations.length > 0) {
    console.log(`\n── سيشاء إنشاء منتجات جديدة / would create (${plan.creations.length})`);
    for (const creation of plan.creations) console.log(`   + ${creation.slug}  ${creation.name}`);
  }

  if (plan.refusals.length > 0) {
    console.log(`\n── لم يتم الإنشاء / not created (${plan.refusals.length})`);
    for (const refusal of plan.refusals) console.log(`   ${refusal.slug}: ${refusal.reason}`);
  }

  if (plan.unknownSlugs.length > 0 && plan.refusals.length === 0) {
    console.log(`\n⚠ صفوف بمعرّف غير موجود / unknown slugs: ${plan.unknownSlugs.join(", ")}`);
  }

  if (plan.duplicates.length > 0) {
    console.error(`\n⚠ معرّفات مكررة / duplicate slugs: ${plan.duplicates.join(", ")}`);
  }

  if (plan.rejections.length > 0) {
    console.error(`\n⚠ خلايا مرفوضة / rejected cells: ${plan.rejections.length}`);
    for (const rejection of plan.rejections) {
      console.error(
        `   line ${rejection.line}  ${rejection.slug}.${rejection.column}: "${rejection.value}" — ${rejection.reason}`,
      );
    }
  }

  if (mode === "dry-run") {
    console.log("\n🔍 معاينة فقط — لم يُكتب أي ملف / dry run, nothing written.");
    console.log("   npm run master:import -- --apply                 # classification + enrichment");
    console.log("   npm run master:import -- --apply --sync-commerce # + prices/availability/names");
  } else {
    const merged = productArraySchema.safeParse(plan.products);
    if (!merged.success) {
      console.error("\n❌ The merged catalogue would not validate — nothing written.");
      for (const issue of merged.error.issues) {
        console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      process.exit(1);
    }

    const serialised = `${JSON.stringify(merged.data, null, 2)}\n`;
    if (serialised === raw) {
      console.log("\nلا تغييرات — لم يُعد كتابة products.json / products.json untouched.");
    } else {
      await writeFile(PRODUCTS_PATH, serialised, "utf8");
      console.log(`\n✅ كُتب data/products.json / written (${merged.data.length} products).`);
    }
  }

  if (mode !== "dry-run") {
    await writeFile(
      STATUS_PATH,
      renderMasterStatusMarkdown(plan.products, new Date().toISOString().slice(0, 10)),
      "utf8",
    );
    console.log("✅ data/product-master-status.md");
  }

  console.log("");
  for (const row of summariseMasterStatus(mode === "dry-run" ? parsed.data : plan.products)) {
    console.log(`  ${row.field.padEnd(34)} ${row.filled}/${row.total}`);
  }

  const failed = plan.rejections.length > 0 || plan.duplicates.length > 0;
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
