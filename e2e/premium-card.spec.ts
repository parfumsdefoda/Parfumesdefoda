import { test, expect } from "@playwright/test";

/**
 * Premium cards in the editorial language.
 *
 * The dark stage, the gold ring and the shine band are gone. A فاخر product is
 * marked by a 1px gold inset frame, a small diamond label above its name, and
 * exactly the same geometry as every other cell.
 */

const CARD = "[data-card]";
const FRAME = "[data-premium-frame]";

test.describe("premium card", () => {
  test("a premium card carries the hairline frame and the diamond label", async ({ page }) => {
    await page.goto("/shop");

    const premium = page.locator(`${CARD}:has(${FRAME})`).first();
    await premium.scrollIntoViewIfNeeded();
    await expect(premium).toHaveCount(1);

    const frame = premium.locator(FRAME);
    await expect(frame).toHaveCount(1);

    const border = await frame.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { width: computed.borderTopWidth, style: computed.borderTopStyle };
    });
    expect(border.width).toBe("1px");
    expect(border.style).toBe("solid");

    await expect(premium.locator("span").filter({ hasText: "◆" }).first()).toBeVisible();
  });

  test("a regular card has neither frame nor label", async ({ page }) => {
    await page.goto("/shop");

    const regular = page.locator(CARD).filter({ hasNot: page.locator(FRAME) }).first();
    await regular.scrollIntoViewIfNeeded();
    await expect(regular).toHaveCount(1);

    await expect(regular.locator(FRAME)).toHaveCount(0);
    await expect(regular.locator("span").filter({ hasText: "◆" })).toBeHidden();
  });

  test("no premium cell paints a dark stage", async ({ page }) => {
    await page.goto("/shop");

    const stage = page.locator(`${CARD}:has(${FRAME}) [data-card-stage]`).first();
    await stage.scrollIntoViewIfNeeded();

    const background = await stage.evaluate((el) => getComputedStyle(el).backgroundColor);
    const channels = (background.match(/[d.]+/g) ?? []).map(Number);
    if (channels.length >= 3 && !background.startsWith("rgba(0, 0, 0, 0")) {
      const [r, g, b] = channels;
      expect(r + g + b).toBeGreaterThan(300);
    }
  });

  test("a premium cell is as tall as a regular one", async ({ page }) => {
    await page.goto("/shop");

    const premium = page.locator(`${CARD}:has(${FRAME})`).first();
    const regular = page.locator(CARD).filter({ hasNot: page.locator(FRAME) }).first();
    await premium.scrollIntoViewIfNeeded();

    const [premiumBox, regularBox] = await Promise.all([premium.boundingBox(), regular.boundingBox()]);
    expect(premiumBox).not.toBeNull();
    expect(regularBox).not.toBeNull();
    expect(Math.abs((premiumBox?.height ?? 0) - (regularBox?.height ?? 0))).toBeLessThanOrEqual(2);
  });

  test("the premium card keeps the name and the price only", async ({ page }) => {
    await page.goto("/shop");

    const premium = page.locator(`${CARD}:has(${FRAME})`).first();
    await premium.scrollIntoViewIfNeeded();

    await expect(premium.locator("h3")).toHaveCount(1);
    await expect(premium.getByText("ج.م").first()).toBeVisible();
    await expect(premium.locator("[data-card-meta]")).toHaveCount(0);
  });
});
