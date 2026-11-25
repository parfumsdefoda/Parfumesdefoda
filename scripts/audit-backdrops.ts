/**
 * Dry-run backdrop audit (RUN 3, R3-1). Nothing is rewritten.
 *
 * For every derived image it measures whether the file really has alpha; when
 * it does not, it samples the 6px border ring and applies the eligibility rules
 * from `src/lib/backdrop.ts`. Eligible photos would be brightened to a pure
 * white backdrop and multiplied into the stage; ineligible ones stay `cover`
 * and are written to `.audit/needs-retouch.txt` with the measured reason.
 *
 * Usage: npx tsx scripts/audit-backdrops.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { analyseBackdrop } from "../src/lib/backdrop";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "src", "data", "image-manifest.json");
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const RETOUCH_PATH = path.join(ROOT, ".audit", "needs-retouch.txt");

interface ManifestEntry {
  source: string;
  background: string;
  blend: string;
  mode?: string;
  files: Array<{ w: number; h?: number; webp?: string; avif?: string }>;
}

interface Manifest {
  version: number;
  products: Record<string, ManifestEntry>;
}

interface Row {
  slug: string;
  source: string;
  name: string;
  class: "alpha" | "eligible" | "ineligible";
  reason: string;
  backdrop: string;
  lightness: number;
  deviation: number;
  gain: string;
}

function hex(rgb: [number, number, number]) {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Manifest;
  const products = JSON.parse(await fs.readFile(PRODUCTS_PATH, "utf8")) as Array<{
    slug: string;
    name: string;
    image: string;
  }>;
  const names = new Map(products.map((product) => [product.slug, product.name]));

  const rows: Row[] = [];
  for (const [slug, entry] of Object.entries(manifest.products)) {
    const files = [...entry.files].sort((a, b) => b.w - a.w);
    const file = files.find((candidate) => candidate.webp);
    if (!file?.webp) continue;
    const absolute = path.join(ROOT, "public", file.webp.replace(/^\//, ""));

    const { data, info } = await sharp(absolute)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minAlpha = 255;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < minAlpha) minAlpha = data[i];
      if (minAlpha < 250) break;
    }

    if (minAlpha < 250) {
      rows.push({
        slug,
        source: entry.source,
        name: names.get(slug) ?? slug,
        class: "alpha",
        reason: "has alpha",
        backdrop: "—",
        lightness: 0,
        deviation: 0,
        gain: "—",
      });
      continue;
    }

    const analysis = analyseBackdrop({
      data: new Uint8Array(data),
      width: info.width,
      height: info.height,
    });
    rows.push({
      slug,
      source: entry.source,
      name: names.get(slug) ?? slug,
      class: analysis.eligible ? "eligible" : "ineligible",
      reason: analysis.reason,
      backdrop: hex(analysis.median),
      lightness: analysis.lightness,
      deviation: analysis.deviation,
      gain: analysis.gain
        ? analysis.gain.map((value) => value.toFixed(3)).join(" / ")
        : "—",
    });
  }

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.class] = (acc[row.class] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Derived entries measured: ${rows.length}`);
  console.log(
    `Classes — alpha: ${counts.alpha ?? 0}, eligible: ${counts.eligible ?? 0}, ineligible: ${counts.ineligible ?? 0}`,
  );

  const eligible = rows.filter((row) => row.class === "eligible");
  console.log(`\nELIGIBLE (${eligible.length}) — white wall, would be gain-normalised + multiply:`);
  for (const row of eligible) {
    console.log(
      `  ${row.slug}\t${row.name}\tbackdrop ${row.backdrop}\tL ${row.lightness.toFixed(3)}\tσ ${row.deviation.toFixed(1)}\tgain ${row.gain}`,
    );
  }

  const ineligible = rows.filter((row) => row.class === "ineligible");
  console.log(`\nINELIGIBLE (${ineligible.length}) — left untouched, shown with cover:`);
  for (const row of ineligible) {
    console.log(
      `  ${row.slug}\t${row.name}\t${row.reason}\tbackdrop ${row.backdrop}\tL ${row.lightness.toFixed(3)}\tσ ${row.deviation.toFixed(1)}`,
    );
  }

  const notAlpha = rows.filter((row) => row.class !== "alpha");
  console.log(`\nNot alpha (${notAlpha.length}): ${notAlpha.map((row) => row.slug).join(", ")}`);

  await fs.mkdir(path.dirname(RETOUCH_PATH), { recursive: true });
  const lines = ineligible.map(
    (row) =>
      `${row.slug}\t${row.source}\t${row.reason}\tbackdrop ${row.backdrop}\tlightness ${row.lightness.toFixed(3)}\tvariance ${row.deviation.toFixed(1)}`,
  );
  await fs.writeFile(
    RETOUCH_PATH,
    [
      "Derived photos without alpha that cannot be normalised onto white.",
      "They stay `cover` until the owner supplies a cut-out.",
      "",
      ...lines,
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`\nWrote ${RETOUCH_PATH} (${lines.length} rows).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
