import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * RUN 1.5 G3 — no banned slogans or claims in the rendered store.
 *
 * Product names come from `data/products.json` and are owner data: they are
 * removed from the scanned text before the stems are checked, so a name like
 * "تيروني (فاخر)" can never fail this test. Everything else — the rendered
 * body text and the meta tags — must look clean.
 */

const BANNED_STEMS = [
  "أصلي",
  "أصلية",
  "أصالة",
  "فاخر",
  "فاخرة",
  "استثنائ",
  "وجهتك",
  "الأولى",
  "تبقى في الذاكرة",
  "نضمن",
  "ضمان",
  "حصري",
  "الأفضل",
  "original",
  "authentic",
  "genuine",
  "luxury",
  "guarantee",
] as const;

/** Factual restocking condition ("بحالته الأصلية") is not a claim of authenticity. */
const FACTUAL_EXCEPTIONS = ["بحالته الأصلية"] as const;

const productNames: string[] = ((): string[] => {
  const raw = readFileSync(join(process.cwd(), "data", "products.json"), "utf-8");
  const products = JSON.parse(raw) as Array<{ name?: string }>;
  return products.map((p) => p.name ?? "").filter(Boolean);
})();

function scrub(text: string): string {
  let cleaned = text;
  // Longest first: "أمواج انترلود" is a prefix of "أمواج انترلود (فاخر)", so
  // scrubbing the short name first would leave a stray "(فاخر)" behind.
  const names = [...productNames].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (name) cleaned = cleaned.split(name).join("");
  }
  for (const exception of FACTUAL_EXCEPTIONS) {
    cleaned = cleaned.split(exception).join("");
  }
  return cleaned.toLowerCase();
}

async function assertClean(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  const bodyText = await page.evaluate(() => document.body.innerText ?? "");
  const metaText = await page.evaluate(() =>
    Array.from(document.querySelectorAll("meta"))
      .map((m) => `${m.getAttribute("name") ?? ""} ${m.getAttribute("content") ?? ""}`)
      .join("\n"),
  );
  const jsonLd = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((s) => s.textContent ?? "")
      .join("\n"),
  );
  const scanned = scrub(`${bodyText}\n${metaText}\n${jsonLd}`);

  const hits = BANNED_STEMS.filter((stem) => scanned.includes(stem.toLowerCase()));
  expect(hits, `banned stems on ${path}: ${hits.join(", ")}`).toEqual([]);
}

const ROUTES = [
  "/",
  "/shop",
  "/product/pf091",
  "/cart",
  "/checkout",
  "/faq",
  "/shipping-returns",
  "/contact",
  "/this-page-does-not-exist",
  "/sitemap.xml",
] as const;

test.describe("banned copy (G3)", () => {
  for (const route of ROUTES) {
    test(`no banned stems on ${route}`, async ({ page }) => {
      await assertClean(page, route);
    });
  }
});
