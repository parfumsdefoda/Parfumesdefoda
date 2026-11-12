import { expect, test, type Page } from "@playwright/test";

/**
 * The product-free hero.
 *
 * The owner does not want product photography above the fold — neither in the
 * floating capsule nor in the banner under it. This suite is the contract:
 * no image of a product in the hero, the header, its search panel or the
 * mobile menu; one heading; the CTA inside the first screen at both sizes; a
 * headline whose last line is not a lone word.
 */

const HERO = "section[aria-labelledby='hero-heading']";

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

/**
 * The words on each visual line of a block.
 *
 * A lone last word is the widow the design must avoid; browsers give no direct
 * API for line boxes, so each word gets a Range and the words are grouped by
 * the top of their rect.
 */
async function lineWordCounts(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluate((element) => {
    const words: { top: number }[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.textContent ?? "";
      const pattern = /\S+/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(value))) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0) words.push({ top: Math.round(rect.top) });
      }
      node = walker.nextNode();
    }
    // Words within 3px of each other share a line.
    const lines: number[] = [];
    let current = -999;
    for (const word of words.sort((a, b) => a.top - b.top)) {
      if (Math.abs(word.top - current) <= 3) lines[lines.length - 1] += 1;
      else {
        lines.push(1);
        current = word.top;
      }
    }
    return lines;
  });
}

test.describe("product-free hero", () => {
  test("the hero contains no product image at all", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    expect(await productImages(page, HERO)).toEqual([]);
    await expect(page.locator(`${HERO} img`)).toHaveCount(0);
    await expect(page.locator(`${HERO} picture`)).toHaveCount(0);
    await expect(page.locator(`${HERO} image`)).toHaveCount(0);
  });

  test("the header, its search panel and the mobile menu stay text only", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    expect(await productImages(page, "header.site-header")).toEqual([]);
    await expect(header.locator("img")).toHaveCount(0);

    // Open the search and type: the suggestions must not grow a thumbnail.
    await page.setViewportSize({ width: 1440, height: 900 });
    const combobox = page.getByRole("combobox").first();
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

  test("one heading, one shop CTA, a balanced headline", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`${HERO} h1`)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "تسوّق الآن" })).toHaveAttribute(
      "href",
      "/shop",
    );

    // No widow: the last line carries at least two words.
    const lines = await lineWordCounts(page, `${HERO} h1`);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[lines.length - 1]).toBeGreaterThanOrEqual(2);
  });

  test("the CTA is inside the first screen at 375x667 and 1440x900", async ({ page }) => {
    for (const size of [
      { width: 375, height: 667 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(size);
      // `load`, not `networkidle`: the homepage prefetches links as soon as it
      // is idle, so "no request for 500 ms" can be a long wait for nothing.
      await page.goto("/", { waitUntil: "load" });
      await page.locator(HERO).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const cta = await page.getByRole("button", { name: "تسوّق الآن" }).boundingBox();
      expect(cta).not.toBeNull();
      expect(cta!.y + cta!.height).toBeLessThanOrEqual(size.height);
      expect(cta!.y).toBeGreaterThanOrEqual(0);
    }
  });

  test("the headline is not wider than the viewport at any width", async ({ page }) => {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await page.locator(HERO).waitFor();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBe(0);
    }
  });

  test("the hero still flips the capsule tone when it scrolls away", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const header = page.locator("header.site-header");
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await expect
      .poll(async () => header.getAttribute("data-hidden"), { timeout: 5000 })
      .toBe("false");
  });
});
