import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const catalogue = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/products.json"), "utf8"));
const listedSlugs = new Set(catalogue.filter((product) => product.hidden !== true).map((product) => product.slug));
const hiddenSlugs = new Set(catalogue.filter((product) => product.hidden === true).map((product) => product.slug));

const base = (process.env.LINK_CHECK_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const queue = new Set(["/", "/shop", "/shop/men", "/shop/women", "/shop/unisex", "/faq", "/shipping-returns", "/contact"]);
const visited = new Set();
const failures = [];
const parser = new XMLParser();

function localPath(value) {
  try {
    const parsed = new URL(value, base);
    return parsed.origin === new URL(base).origin ? `${parsed.pathname}${parsed.search}` : null;
  } catch {
    return null;
  }
}

while (queue.size) {
  const path = queue.values().next().value;
  queue.delete(path);
  if (visited.has(path)) continue;
  visited.add(path);
  let response;
  try {
    response = await fetch(`${base}${path}`, { redirect: "manual" });
  } catch (error) {
    failures.push(`${path}: request failed (${error instanceof Error ? error.message : "unknown"})`);
    continue;
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    failures.push(`${path}: redirect ${response.status} to ${location}; internal link should target final URL directly`);
    continue;
  }
  if (response.status !== 200) {
    failures.push(`${path}: HTTP ${response.status}`);
    continue;
  }
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) continue;
  const html = await response.text();
  for (const match of html.matchAll(/href="([^"#]+)"/g)) {
    const next = localPath(match[1]);
    if (next && !next.startsWith("/api/") && !next.startsWith("/_next/")) queue.add(next);
  }
}

let sitemapUrls = [];
try {
  const sitemap = await fetch(`${base}/sitemap.xml`, { redirect: "manual" });
  if (sitemap.status !== 200) failures.push(`/sitemap.xml: HTTP ${sitemap.status}`);
  else {
    const parsed = parser.parse(await sitemap.text());
    const entries = parsed.urlset?.url ?? [];
    sitemapUrls = (Array.isArray(entries) ? entries : [entries]).map((entry) => localPath(entry.loc)).filter(Boolean);
    if (sitemapUrls.length === 0) failures.push("/sitemap.xml: contains no URLs");
    for (const url of sitemapUrls) {
      const response = await fetch(`${base}${url}`, { redirect: "manual" });
      if (response.status !== 200) failures.push(`sitemap URL ${url}: HTTP ${response.status}`);
      if (response.status >= 300 && response.status < 400) failures.push(`sitemap URL ${url}: redirect chain to ${response.headers.get("location")}`);
    }
  }
} catch (error) {
  failures.push(`sitemap crawl failed: ${error instanceof Error ? error.message : "unknown"}`);
}

// Every listed product URL must be a real, visible catalogue product — no
// hidden product (they answer 404) and no stale/unknown slug.
for (const url of sitemapUrls.filter((entry) => entry.includes("/product/"))) {
  const slug = url.split("/product/")[1]?.split("?")[0];
  if (!slug || !listedSlugs.has(slug)) {
    failures.push(`sitemap lists a product URL that is not visible in the catalogue: ${url}`);
  }
  if (slug && hiddenSlugs.has(slug)) failures.push(`sitemap lists a hidden product: ${url}`);
}
console.log(`Crawled ${visited.size} internal paths and ${sitemapUrls.length} sitemap URLs.`);
if (failures.length) {
  console.error(`Link check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else console.log("Internal links and sitemap URLs are healthy.");
