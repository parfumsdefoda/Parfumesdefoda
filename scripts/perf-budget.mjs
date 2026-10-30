#!/usr/bin/env node
/**
 * First-load JavaScript budget.
 *
 * "First-load" is exactly the `<script src>` list in the initial HTML — the
 * bytes a phone must download before the page can become interactive. Lazy
 * chunks (the cart drawer, the advisor panel, the size chooser) are not part of
 * it, and that is the point of splitting them out.
 *
 * The budget is compared against BROTLI-compressed bytes, because that is what
 * a production edge serves (see docs/Release-Plan.md). `next start` alone only
 * speaks gzip, so the gzip figure is printed too: it is the same build, just a
 * weaker encoding, and it is why the deployment must terminate compression at
 * the proxy.
 *
 * Usage: PERF_BASE_URL=http://127.0.0.1:3227 npm run perf:budget
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const base = process.env.PERF_BASE_URL ?? "http://127.0.0.1:3227";
const chunksDir = process.env.CHUNKS_DIR ?? ".next/static/chunks";

/** KiB of brotli-compressed initial JavaScript. */
const TARGETS = [
  { route: "/", budget: 240 },
  { route: "/shop", budget: 240 },
  { route: "/shop/men", budget: 240 },
  { route: "/product/pf090", budget: 240 },
  { route: "/product/pf680", budget: 240 },
  { route: "/cart", budget: 240 },
  { route: "/checkout", budget: 260 },
];

function chunkPath(src) {
  const match = src.match(/\/_next\/static\/chunks\/(.+)$/);
  return match ? path.join(chunksDir, match[1]) : null;
}

function measure(html) {
  const srcs = [
    ...new Set([
      ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/<link[^>]+rel="preload"[^>]+as="script"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
    ]),
  ].filter((src) => src.includes("/_next/static/chunks/"));

  let brotli = 0;
  let gzip = 0;
  let missing = 0;
  for (const src of srcs) {
    const file = chunkPath(src);
    if (!file || !fs.existsSync(file)) {
      missing += 1;
      continue;
    }
    const buf = fs.readFileSync(file);
    brotli += zlib.brotliCompressSync(buf, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
    gzip += zlib.gzipSync(buf, { level: 9 }).length;
  }
  return { scripts: srcs.length, brotli, gzip, missing };
}

const rows = [];
const failures = [];

for (const target of TARGETS) {
  let html;
  try {
    const response = await fetch(`${base}${target.route}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (error) {
    failures.push(`${target.route}: could not be measured (${error.message}) — is the production server running?`);
    continue;
  }

  const measured = measure(html);
  const brotliKiB = Math.round(measured.brotli / 1024);
  const gzipKiB = Math.round(measured.gzip / 1024);
  rows.push({
    route: target.route,
    scripts: measured.scripts,
    "brotli KiB": brotliKiB,
    "gzip KiB": gzipKiB,
    budget: target.budget,
    status: brotliKiB <= target.budget ? "ok" : `over by ${brotliKiB - target.budget}`,
  });

  if (measured.missing > 0) {
    failures.push(`${target.route}: ${measured.missing} initial script(s) are not in ${chunksDir}`);
  }
  if (brotliKiB > target.budget) {
    failures.push(`${target.route}: ${brotliKiB} KiB brotli exceeds the ${target.budget} KiB budget`);
  }
}

console.table(rows);
if (failures.length) {
  console.error(`First-load JS budget failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`First-load JS budget ok (${rows.length} routes, brotli).`);
}
