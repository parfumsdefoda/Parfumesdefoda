#!/usr/bin/env node
/**
 * One command for the owner's recurring product refresh.
 *
 *   npm run data:refresh            # preview: validate, audit photos, show the diff
 *   npm run data:refresh -- --apply # write it: import, derive images, run every gate
 *
 * Order (stops at the FIRST failure, with an Arabic + English message):
 *   1. validate the master (headers, duplicates, enums, oil conflicts, photos)
 *   2. audit the photos and rebuild the derivatives of changed originals
 *   3. import the master (`--sync-commerce --create-missing`)
 *   4. derive the photos of the newly created products
 *   5. validate-json, check:tokens, typecheck, lint, test, build
 *
 * Nothing is ever pushed, committed or deleted. `--apply` writes only
 * data/products.json, its status file, the image manifest and derived assets.
 *
 * Usage:
 *   npm run data:refresh
 *   npm run data:refresh -- --apply
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { planMasterImport } from "../src/lib/product-master.ts";
import { productArraySchema } from "../src/schemas/product-schema.ts";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const CSV_PATH = path.join(ROOT, "data", "product-master.csv");

const apply = process.argv.includes("--apply");

/**
 * `--hide-absent` hides every product the master no longer lists;
 * `--hide-absent=pf670,pf671` restricts that to the named rows.
 * Without it an absent product is only reported and stays visible.
 */
const hideAbsentArg = process.argv.find(
  (arg) => arg === "--hide-absent" || arg.startsWith("--hide-absent="),
);
const hideAbsent =
  hideAbsentArg === "--hide-absent"
    ? true
    : hideAbsentArg
      ? hideAbsentArg
          .slice("--hide-absent=".length)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;

/** Run an npm script. Stops the whole refresh on a non-zero exit. */
function run(label, args, { capture = false } = {}) {
  console.log(`\n── ${label}  (npm run ${args.join(" ")})`);
  // `npm run script --flag` is an npm CONFIG flag, not a script argument: npm
  // warns "Unknown cli config" and the script never sees it. The `--` separator
  // is what forwards everything to the script (this is how --create-missing
  // silently stopped reaching the importer).
  const npmArgs = ["run", args[0], "--", ...args.slice(1)];
  const result = spawnSync("npm", npmArgs, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });

  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    console.error(
      `\n❌ ${label} — فشل، توقّفت العملية / failed, refresh stopped (exit ${result.status ?? "?"}).`,
    );
    console.error(
      "   أصلح المشكلة أعلاه ثم أعد المحاولة / fix the message above, then run it again.",
    );
    process.exit(result.status ?? 1);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function count(changes, pattern) {
  return changes.filter((change) => pattern.test(change.field)).length;
}

async function main() {
  console.log("═══ تحديث بيانات المنتجات / product data refresh ═══");
  console.log(apply ? "الوضع: كتابة / mode: APPLY" : "الوضع: معاينة / mode: DRY RUN (nothing written)");

  // ── 1. Validate the master ──
  console.log("\n── 1/5 التحقق من الملف / validating the master");

  let raw;
  try {
    raw = await readFile(PRODUCTS_PATH, "utf8");
  } catch {
    console.error("❌ data/products.json غير موجود / not found.");
    process.exit(1);
  }

  const parsed = productArraySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("❌ data/products.json لا يطابق المخطط / does not match the schema:");
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`   - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  let csv;
  try {
    csv = await readFile(CSV_PATH, "utf8");
  } catch {
    console.error("❌ data/product-master.csv غير موجود / not found.");
    console.error("   أنشئه أولاً / create it first:  npm run master:export");
    process.exit(1);
  }

  const plan = planMasterImport(parsed.data, csv, {
    mode: apply ? "sync-commerce" : "dry-run",
    createMissing: true,
    hideAbsent,
    imageExists: (imagePath) =>
      existsSync(path.join(ROOT, "public", imagePath.replace(/^\//, ""))),
  });

  if (plan.rejections.length > 0) {
    console.error(`❌ خلايا مرفوضة / rejected cells: ${plan.rejections.length}`);
    for (const rejection of plan.rejections) {
      console.error(
        `   line ${rejection.line}  ${rejection.slug}.${rejection.column}: "${rejection.value}" — ${rejection.reason}`,
      );
    }
    console.error(
      "\n   أصلح هذه الخلايا في data/product-master.csv ثم أعد المحاولة.\n   Fix these cells in data/product-master.csv, then run again.",
    );
    process.exit(1);
  }

  // A missing photo or field on a NEW row is reported by the importer and
  // skipped: it must not block the price/availability updates of every other
  // product until the owner adds the file. Real errors (rejected cells,
  // duplicate slugs, an unreadable master) still stop above.
  if (plan.refusals.length > 0) {
    console.warn(`⚠ منتجات جديدة لم تُنشأ / new products not created: ${plan.refusals.length}`);
    for (const refusal of plan.refusals) {
      console.warn(`   ${refusal.slug}: ${refusal.reason}`);
    }
    console.warn(
      "   أضف الصورة ثم أعد التشغيل — بقية الملف يُطبّق عاديًا.\n   Add the photo and run again — the rest of the file still applies.",
    );
  }

  if (plan.duplicates.length > 0) {
    console.error(`❌ معرّفات مكررة / duplicate slugs: ${plan.duplicates.join(", ")}`);
    process.exit(1);
  }

  // ── 2. Photos: audit, then rebuild what changed ──
  console.log("\n── 2/5 الصور / photos");
  run("صورة: تدقيق / image audit", ["audit:images"]);

  let builtSummary = "لم تُبنَ صور (معاينة) / images not built (dry run)";
  if (apply) {
    const output = run("صور: اشتقاق المتغيّرة / derive changed photos", ["build:images"], {
      capture: true,
    });
    const match = /built (\d+) · cached (\d+) · skipped (\d+)/.exec(output);
    builtSummary = match
      ? `بُني ${match[1]} · محدّث ${match[2]} · متخطّى ${match[3]} / built ${match[1]}, cached ${match[2]}, skipped ${match[3]}`
      : "تم / done";
  }

  // ── 3. Import ──
  console.log("\n── 3/5 الاستيراد / import");
  const importArgs = ["master:import", "--create-missing"];
  if (hideAbsentArg) importArgs.push(hideAbsentArg);
  if (apply) importArgs.push("--apply", "--sync-commerce");
  run(
    apply ? "استيراد وكتابة / import and write" : "استيراد معاينة / import preview",
    importArgs,
  );

  // ── 4. Photos of the new products + gates ──
  if (apply) {
    console.log("\n── 4/5 صور المنتجات الجديدة / photos of new products");
    const output = run("صور: اشتقاق الجديد / derive new photos", ["build:images"], {
      capture: true,
    });
    const match = /built (\d+) · cached (\d+) · skipped (\d+)/.exec(output);
    if (match) {
      builtSummary += `\n                     ثم الجديد / then new: بُني ${match[1]} · محدّث ${match[2]} · متخطّى ${match[3]}`;
    }

    console.log("\n── 5/5 الفحوصات / gates");
    for (const script of ["validate-json", "check:tokens", "typecheck", "lint", "test", "build"]) {
      run(`فحص / gate: ${script}`, [script]);
    }
  } else {
    console.log("\n── 4/5 و 5/5 مؤجّلة حتى --apply / deferred until --apply");
  }

  // ── Summary ──
  const sizesCreated = count(plan.changes, /^sizes\.[^.]+$/);
  const priceChanges = count(plan.changes, /\.price$/);
  const availabilityChanges =
    count(plan.changes, /\.inStock$/) +
    plan.changes.filter((change) => change.field === "inStock").length;
  const flagsOff = plan.flagToggles.filter((toggle) => !toggle.to).length;

  console.log("\n═══ الملخص / summary ═══");
  console.log(`  منتجات جديدة / new products        ${plan.creations.length}`);
  console.log(`  لم تُنشأ / not created             ${plan.refusals.length}`);
  console.log(`  أحجام جديدة / new sizes            ${sizesCreated}`);
  console.log(`  أسعار معدّلة / price changes        ${priceChanges}`);
  console.log(`  مخزون معدّل / availability changes ${availabilityChanges}`);
  console.log(`  أعلام تشغّل / flags on              ${plan.flagToggles.length - flagsOff}`);
  console.log(`  أعلام تُطفأ / flags off             ${flagsOff}`);
  console.log(`  صور placeholder → حقيقية / photos   ${plan.imageFixes.length}`);
  console.log(`  أعمدة غائبة / absent columns        ${plan.header.absent.join(", ") || "none"}`);
  console.log(`  في الكتالوج وليس الملف / absent rows ${plan.absentFromMaster.join(", ") || "none"}`);
  console.log(
    `  ${apply ? "أُخفي" : "سيُخفى"} / hidden via absent  ${plan.hiddenByAbsence.join(", ") || "none"}`,
  );
  console.log(`  ملاحظات / warnings                  ${plan.warnings.length}`);
  console.log(`  الصور / images                     ${builtSummary}`);

  if (plan.warnings.length > 0) {
    console.log("\n  ملاحظات / warnings:");
    for (const warning of plan.warnings.slice(0, 20)) {
      console.log(`   line ${warning.line}  ${warning.slug}.${warning.column}: ${warning.message}`);
    }
  }

  if (flagsOff > 0) {
    console.log(
      "\n  ⚠ خلايا العلم الفارغة تعني «لا» — المنتجات التالية ستفقد علمها.\n" +
        "    Blank flag cells mean \"لا\": the products listed under flag changes lose theirs.\n" +
        "    املأ نعم في العمود للحفاظ عليها / fill نعم in that column to keep it.",
    );
  }

  if (!apply) {
    console.log("\n🔍 معاينة فقط — لم يُكتب أي ملف / dry run, nothing written.");
    console.log("   للكتابة / to write:  npm run data:refresh -- --apply");
  } else {
    console.log("\n✅ تم التحديث والفحوصات كلها ناجحة / refreshed, every gate passed.");
    console.log("   لا يتم أي push / nothing was pushed.");
  }
}

main().catch((error) => {
  console.error(
    "❌ تحديث البيانات فشل / data refresh failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
