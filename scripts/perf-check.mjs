import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.PERF_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(".measure/perf-check");
const targets = [
  { route: "/", minPerf: 90, indexable: true },
  { route: "/shop", minPerf: 85, indexable: true },
  { route: "/shop/men", minPerf: 85, indexable: true },
  { route: "/product/pf090", minPerf: 90, indexable: true },
  { route: "/product/pf230", minPerf: 90, indexable: true },
  { route: "/cart", minPerf: 85, indexable: false },
  { route: "/checkout", minPerf: 85, indexable: false },
];
const runsPerRoute = 3;
const results = [];
const failures = [];

// Start from an empty directory: a stale report from an earlier run would be
// read back as this run's measurement.
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const target of targets) {
  const runs = [];
  for (let run = 1; run <= runsPerRoute; run += 1) {
    const output = path.join(outputDir, `${target.route.replaceAll("/", "_") || "home"}-${run}.json`);
    const url = `${baseUrl}${target.route}`;
    const args = [
      "--chrome-flags=--headless=new --no-sandbox",
      "--form-factor=mobile",
      "--screenEmulation.mobile=true",
      "--throttling-method=simulate",
      "--output=json",
      `--output-path=${output}`,
      "--quiet",
      url,
    ];
    // Node >=20.12 refuses to spawn a .cmd without a shell (EINVAL on Windows),
    // so run npx through the shell on every platform.
    const completed = spawnSync("npx", ["--no-install", "lighthouse", ...args], {
      encoding: "utf8",
      env: process.env,
      timeout: 180_000,
      windowsHide: true,
      shell: true,
    });
    if (completed.status !== 0 || !fs.existsSync(output)) {
      failures.push(`${target.route}: Lighthouse run ${run} failed (${completed.error?.message ?? completed.stderr ?? completed.status})`);
      continue;
    }
    const json = JSON.parse(fs.readFileSync(output, "utf8"));
    const audits = json.audits;
    const requests = audits["network-requests"]?.details?.items ?? [];
    const jsBytes = requests
      .filter((item) => item.resourceType === "Script" || item.mimeType?.includes("javascript"))
      .reduce((total, item) => total + (item.transferSize ?? 0), 0);
    const lcpItem = audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0];
    runs.push({
      perf: Math.round(json.categories.performance.score * 100),
      a11y: Math.round(json.categories.accessibility.score * 100),
      seo: Math.round(json.categories.seo.score * 100),
      lcpMs: Math.round(audits["largest-contentful-paint"].numericValue),
      tbtMs: Math.round(audits["total-blocking-time"].numericValue),
      cls: Number(audits["cumulative-layout-shift"].numericValue.toFixed(3)),
      jsBytes,
      lcpElement: lcpItem?.node?.snippet ?? "unknown",
      lcpUrl: lcpItem?.url ?? null,
    });
  }
  const median = (key) => {
    const values = runs.map((run) => run[key]).sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : null;
  };
  const row = {
    route: target.route,
    runs,
    median: {
      perf: median("perf"),
      a11y: median("a11y"),
      seo: median("seo"),
      lcpMs: median("lcpMs"),
      tbtMs: median("tbtMs"),
      cls: median("cls"),
      jsBytes: median("jsBytes"),
      lcpElement: runs[0]?.lcpElement ?? "unmeasured",
      lcpUrl: runs[0]?.lcpUrl ?? null,
    },
  };
  results.push(row);
  if (runs.length !== runsPerRoute) failures.push(`${target.route}: only ${runs.length}/${runsPerRoute} Lighthouse measurements completed`);
  const m = row.median;
  if (m.perf !== null && m.perf < target.minPerf) failures.push(`${target.route}: performance ${m.perf} below ${target.minPerf}`);
  if (m.a11y !== null && m.a11y !== 100) failures.push(`${target.route}: accessibility ${m.a11y}, expected 100`);
  if (target.indexable && m.seo !== null && m.seo !== 100) failures.push(`${target.route}: SEO ${m.seo}, expected 100`);
  if (m.cls !== null && m.cls > 0.01) failures.push(`${target.route}: CLS ${m.cls} above 0.01`);
  if (m.tbtMs !== null && m.tbtMs > 100) failures.push(`${target.route}: TBT ${m.tbtMs}ms above 100ms`);
  if (m.jsBytes !== null && m.jsBytes > 300 * 1024) failures.push(`${target.route}: JS ${(m.jsBytes / 1024).toFixed(0)} KiB above 300 KiB`);
}

const summaryPath = path.join(outputDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify({ baseUrl, runsPerRoute, results, failures }, null, 2));
console.table(results.map((row) => ({
  route: row.route,
  perf: row.median.perf,
  LCP: row.median.lcpMs,
  TBT: row.median.tbtMs,
  CLS: row.median.cls,
  a11y: row.median.a11y,
  SEO: row.median.seo,
  JS_KiB: row.median.jsBytes === null ? null : Math.round(row.median.jsBytes / 1024),
  LCP_element: row.median.lcpElement,
})));
console.log(`Lighthouse report: ${path.relative(process.cwd(), summaryPath)}`);
if (failures.length) {
  console.error(`Performance budget failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
}
