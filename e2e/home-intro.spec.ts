import { expect, test, type Page } from "@playwright/test";

/**
 * The homepage after RUN 1.5.
 *
 * The contract: header, then the product grid DIRECTLY (no intro, no banner,
 * no categories band, no advisor band), then one full-width hairline row
 * "عرض كل المنتجات", then the footer. Exactly one visually hidden h1 with
 * neutral text.
 */

async function productImages(root: string, page: Page) {
  return page.locator(root).evaluate((el) => {
    const offenders: string[] = [];
    for (const node of Array.from(el.querySelectorAll("*"))) {
      const tag = node.tagName.toLowerCase();
      if (tag === "img" || tag === "picture") {
        offenders.push(`${tag}:${(node as HTMLImageElement).currentSrc || node.textContent}`);
        continue;
      }
      if (tag === "image") {
        offenders.push("svg image");
        continue;
      }
      const background = getComputedStyle(node as Element).backgroundImage;
      if (background.includes("/products/")) offenders.push(`bg:${background.slice(0, 60)}`);
    }
    return offenders;
  });
}

test.describe("home structure (RUN 1.5)", () => {
  test("one visually hidden h1 with neutral text", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Parfums De Foda | العطور");
    const className = (await h1.getAttribute("class")) ?? "";
    expect(className).toMatch(/sr-only/);
    // Playwright treats a clipped .sr-only box as visible, so assert the
    // metrics that prove it is visually hidden instead of toBeHidden().
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1);
  });

  test("no intro, no categories band, no advisor band, no slogan", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator("#home-intro, [data-home-intro]")).toHaveCount(0);
    await expect(page.locator("#categories-heading, [data-category-tiles]")).toHaveCount(0);
    await expect(page.locator("[data-advisor-band], [data-advisor-launcher]")).toHaveCount(0);
    await expect(page.getByText("عطور تبقى في الذاكرة")).toHaveCount(0);
    await expect(page.getByText("تسوّق حسب القسم")).toHaveCount(0);
  });

  test("the grid starts directly under the header and shows 12 products", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    const grid = page.locator("section[aria-label] div[class*='grid']").first();
    const headerBox = await header.boundingBox();
    const gridBox = await grid.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(gridBox).not.toBeNull();
    expect(Math.round(gridBox!.y)).toBe(Math.round(headerBox!.y + headerBox!.height));

    const cards = page.locator("section[aria-label] [data-card]");
    await expect(cards).toHaveCount(12);
  });

  test("one full-width hairline row عرض كل المنتجات after the grid", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const row = page.getByRole("link", { name: "عرض كل المنتجات" });
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("href", "/shop");

    const rowBox = await row.boundingBox();
    expect(rowBox).not.toBeNull();
    // Full-width row: spans the viewport (mobile) up to the 1920px cap.
    const viewport = await page.evaluate(() => window.innerWidth);
    expect(Math.round(rowBox!.width)).toBeGreaterThan(viewport - 40);
  });

  test("footer has no shop category column and no removed lines", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const footer = page.locator("footer");
    await expect(footer.getByRole("navigation", { name: "المتجر" })).toHaveCount(0);
    await expect(footer.getByText("وجهتك الأولى للعطور الفاخرة. عطور أصلية بجودة استثنائية.")).toHaveCount(0);
    await expect(footer.getByText("الدفع عند الاستلام · شحن ثابت ١٠٠ ج.م لكل الطلبات")).toHaveCount(0);
    await expect(footer.getByRole("navigation", { name: "المساعدة" })).toHaveCount(1);
    await expect(footer.getByRole("heading", { name: "تواصل معنا" })).toHaveCount(1);
  });

  test("the header stays text only", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    expect(await productImages("header.site-header", page)).toEqual([]);
    await expect(header.locator("img")).toHaveCount(0);
  });

  test("no horizontal overflow at any width", async ({ page }) => {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await page.locator("h1").waitFor();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBe(0);
    }
  });
});
