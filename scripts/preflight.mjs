import fs from "node:fs";
import path from "node:path";

const failures = [];
const warnings = [];
const env = process.env;
const args = process.argv.slice(2);
const urlArg = args.find((arg) => arg.startsWith("--url="));
const base = (urlArg?.slice("--url=".length) ?? "").replace(/\/$/, "");
const production = env.NODE_ENV === "production";
const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));
const settings = JSON.parse(fs.readFileSync(path.join(root, "data/settings.json"), "utf8"));
const contact = JSON.parse(fs.readFileSync(path.join(root, "data/contact.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/image-manifest.json"), "utf8"));
const expectedHost = (() => {
  try { return new URL(env.NEXT_PUBLIC_SITE_URL ?? "https://parfumsdefoda.com").host; }
  catch { return ""; }
})();

const requiredByName = {
  RESEND_API_KEY: "email order channel API key",
  OWNER_EMAIL: "email order recipient",
  RESEND_FROM_EMAIL: "verified sender for email notifications",
  CALLMEBOT_PHONE_1: "WhatsApp order recipient",
  CALLMEBOT_API_KEY_1: "WhatsApp channel API key",
  CALLMEBOT_PHONE_2: "optional second WhatsApp recipient",
  CALLMEBOT_API_KEY_2: "optional second WhatsApp channel API key",
  UPSTASH_REDIS_REST_URL: "optional Redis URL (KV_REST_API_URL is accepted)",
  UPSTASH_REDIS_REST_TOKEN: "optional Redis token (KV_REST_API_TOKEN is accepted)",
  OPENAI_API_KEY: "optional AI advisor API key",
  NEXT_PUBLIC_SITE_URL: "public canonical site origin",
};
for (const [name, purpose] of Object.entries(requiredByName)) {
  if (name === "UPSTASH_REDIS_REST_URL" && (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL)) continue;
  if (name === "UPSTASH_REDIS_REST_TOKEN" && (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)) continue;
  if (name === "CALLMEBOT_PHONE_2" || name === "CALLMEBOT_API_KEY_2") continue;
  if (name === "OPENAI_API_KEY" || name.startsWith("UPSTASH") || name === "NEXT_PUBLIC_SITE_URL") {
    if (!env[name] && !(name === "NEXT_PUBLIC_SITE_URL" && !production)) warnings.push(`${name}: not set (${purpose}); defaults/fallbacks apply`);
    continue;
  }
  if (!env[name]) warnings.push(`${name}: not set (${purpose})`);
}
const hasEmail = Boolean(env.RESEND_API_KEY && env.OWNER_EMAIL && env.RESEND_FROM_EMAIL);
const hasWhatsApp = Boolean(
  (env.CALLMEBOT_PHONE_1 && env.CALLMEBOT_API_KEY_1) ||
  (env.CALLMEBOT_PHONE_2 && env.CALLMEBOT_API_KEY_2),
);
if (production && !hasEmail && !hasWhatsApp) failures.push("production requires at least one complete order channel (email or WhatsApp)");

if (settings.shipping?.cost !== 100) failures.push(`settings.shipping.cost must be 100; found ${String(settings.shipping?.cost)}`);
if (!contact.whatsapp && !contact.email) failures.push("data/contact.json must contain customer contact details");
if (contact.whatsapp && !/^20\d{10}$/.test(contact.whatsapp)) failures.push("data/contact.json whatsapp must be Egyptian country code 20 followed by 10 digits");
if (!Array.isArray(products) || products.length === 0) failures.push("data/products.json must be a non-empty array");
// Derivatives, checked against the pipeline's real contract:
//   • a hidden product is never served, so it needs no assets (same rule as
//     scripts/check-derived-images.mjs);
//   • every file the manifest declares must exist on disk;
//   • a `cutout` entry carries the AVIF+WebP ladder through 1200 plus the
//     2000 WebP;
//   • a `framed` entry is a resize-only copy of a photo that cannot be cut out
//     (coloured background): it stops at 1200 and may stop earlier when the
//     source itself is smaller, so requiring a 2000 WebP for it only produced
//     false failures on every retouch-pending photo.
const checkedDerivatives = new Set();
for (const product of products) {
  if (product.hidden === true) continue;
  if (product.image?.includes("placeholder")) continue;
  // Cover and first gallery image are usually the same file: check it once.
  for (const src of new Set([product.image, ...(product.gallery ?? [])].filter(Boolean))) {
    const slug = path.basename(src).replace(/\.[^.]+$/, "").toLowerCase();
    if (checkedDerivatives.has(slug)) continue;
    checkedDerivatives.add(slug);

    const entry = manifest.products?.[slug];
    if (!entry) {
      failures.push(`${product.slug}: no derived image entry for ${slug}`);
      continue;
    }

    let declared = 0;
    for (const file of entry.files ?? []) {
      for (const format of ["avif", "webp"]) {
        const asset = file[format];
        if (!asset) continue;
        declared += 1;
        if (!fs.existsSync(path.join(root, "public", asset.replace(/^\//, "")))) {
          failures.push(`${product.slug}: ${file.w}px ${format} derivative is declared but missing on disk for ${slug}`);
        }
      }
    }
    if (declared === 0) failures.push(`${product.slug}: derived entry for ${slug} declares no files`);

    if ((entry.mode ?? "cutout") === "cutout") {
      for (const width of [400, 800, 1200]) {
        const derivative = entry.files.find((file) => file.w === width);
        for (const format of ["avif", "webp"]) {
          if (!derivative?.[format]) failures.push(`${product.slug}: cut-out ${slug} is missing its ${width}px ${format}`);
        }
      }
      if (!entry.files.find((file) => file.w === 2000)?.webp) {
        failures.push(`${product.slug}: cut-out ${slug} is missing its 2000px webp`);
      }
    }
  }
}

async function checkUrl(route, expected, name) {
  if (!base) return;
  try {
    const response = await fetch(`${base}${route}`, { redirect: "manual" });
    if (!expected(response.status)) failures.push(`${name}: unexpected HTTP ${response.status}`);
    return response;
  } catch (error) {
    failures.push(`${name}: request failed (${error instanceof Error ? error.message : "unknown error"})`);
  }
}

if (!base) warnings.push("Pass --url=<deployed base URL> to run HTTP checks.");
else {
  const [home, sitemap, robots, api] = await Promise.all([
    checkUrl("/", (status) => status === 200, "homepage"),
    checkUrl("/sitemap.xml", (status) => status === 200, "sitemap"),
    checkUrl("/robots.txt", (status) => status === 200, "robots"),
    checkUrl("/api/orders", (status) => status === 405 || status === 404, "GET /api/orders"),
  ]);
  if (home) {
    const html = await home.text();
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1]
      ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i)?.[1];
    if (!canonical) failures.push("homepage: canonical link missing");
    else if (expectedHost && new URL(canonical, base).host !== expectedHost) failures.push(`homepage canonical host differs from NEXT_PUBLIC_SITE_URL (${new URL(canonical, base).host})`);
    const jsonLd = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, block] of jsonLd) {
      try { JSON.parse(block); } catch { failures.push("homepage: invalid JSON-LD block"); }
    }
    if (jsonLd.length === 0) failures.push("homepage: JSON-LD not found");
    for (const header of ["x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options"]) {
      if (!home.headers.get(header)) failures.push(`homepage: missing ${header} response header`);
    }
  }
  if (sitemap) {
    const xml = await sitemap.text();
    if (!xml.includes("<loc>")) failures.push("sitemap: no loc entries");
    // Contract: every visible product is listed (coming-soon pages answer 200 and
    // are indexable); hidden products must never appear.
    for (const product of products.filter((entry) => entry.hidden === true)) {
      if (xml.includes(`/product/${product.slug}`)) failures.push(`sitemap: hidden product listed (${product.slug})`);
    }
  }
}

if (warnings.length) console.warn(`Preflight warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}`);
if (failures.length) {
  console.error(`Preflight failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Preflight passed: local settings, contact, catalogue assets, and supplied HTTP checks are valid.");
}
