import { expect, test, type Page } from "@playwright/test";

/**
 * The homepage intro, after the hero was removed.
 *
 * The contract: one h1 in a hairline intro bar, one "عرض الكل" link to /shop,
 * no product photography above the fold, and the best-seller grid directly
 * under the bar. The header stays a text-only paper bar over any section.
 */

const INTRO = "section[aria-labelledby='home-intro']";

/** Every image-ish node inside a root, including CSS backgrounds. */
async function productImages(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const offenders: string[] = [];
    for (const node of Array.from(root.querySelectorAll("*"))) {
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

test.describe("home intro", () => {
  test("one h1, one view-all link, no product image in the bar", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`${INTRO} h1`)).toHaveCount(1);
    await expect(page.locator(INTRO).getByRole("link", { name: "عرض الكل" })).toHaveAttribute(
      "href",
      "/shop",
    );

    expect(await productImages(page, INTRO)).toEqual([]);
    await expect(page.locator(`${INTRO} img`)).toHaveCount(0);
    await expect(page.locator(`${INTRO} picture`)).toHaveCount(0);
  });

  test("the best sellers sit directly under the intro bar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const intro = await page.locator(INTRO).boundingBox();
    const grid = await page.locator("section[aria-labelledby='best-sellers-heading']").boundingBox();
    expect(intro).not.toBeNull();
    expect(grid).not.toBeNull();
    expect(Math.round(grid!.y)).toBe(Math.round(intro!.y + intro!.height));

    const cards = page.locator("section[aria-labelledby='best-sellers-heading'] a[href^='/product/']");
    expect(await cards.evaluateAll((links) => new Set(links.map((a) => a.getAttribute("href"))).size)).toBe(8);
  });

  test("the header, its search panel and the mobile menu stay text only", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    expect(await productImages(page, "header.site-header")).toEqual([]);
    await expect(header.locator("img")).toHaveCount(0);

    // Open the search and type: the suggestions must not grow a thumbnail.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(async () => {
      await page.getByRole("button", { name: "بحث" }).first().click();
      await expect(page.locator("#mobile-search-panel")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const combobox = page.locator("#mobile-search-panel").getByRole("combobox").first();
    await combobox.click();
    await combobox.fill("عطر");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(header.locator("img, picture, image")).toHaveCount(0);
    expect(await productImages(page, "header.site-header")).toEqual([]);
    await page.keyboard.press("Escape");

    // And the mobile menu sheet, on a phone.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "القائمة" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img, picture, image")).toHaveCount(0);
    const menuOffenders = await dialog.evaluate((root) =>
      Array.from(root.querySelectorAll("*"))
        .map((node) => getComputedStyle(node).backgroundImage)
        .filter((value) => value.includes("/products/")),
    );
    expect(menuOffenders).toEqual([]);
  });

  test("the intro bar is not wider than the viewport at any width", async ({ page }) => {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await page.locator(INTRO).waitFor();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBe(0);
    }
  });

  test("the header stays one solid paper bar while the page scrolls", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const header = page.locator("header.site-header");
    const paper = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    expect(await header.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(paper);
    expect(paper).not.toBe("rgba(0, 0, 0, 0)");
  });
});
