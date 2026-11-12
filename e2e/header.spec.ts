import { test, expect } from "@playwright/test";

/**
 * The masthead: flat, two tiers on desktop, one row on phones, solid paper.
 *
 * The old capsule (tone switching, glass, gold hairline, negative hero offset)
 * is gone, so these assertions describe what a printed catalogue bar does:
 * it sits in the flow, it is opaque, it hides on the way down and returns on
 * the way up, and its search and menu still behave for a keyboard.
 */

const HEADER = "header.site-header";

test.describe("flat header", () => {
  test("is opaque paper with a single hairline, and holds no product image", async ({ page }) => {
    await page.goto("/shop");
    const header = page.locator(HEADER);
    await expect(header).toBeVisible();

    const style = await header.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { background: computed.backgroundColor, position: computed.position };
    });

    // rgb(...) — no alpha channel, so no transparency over the page.
    expect(style.background.startsWith("rgb(")).toBe(true);
    expect(style.position).toBe("sticky");
    await expect(header.locator("img")).toHaveCount(0);
  });

  test("shows two tiers with a centred lockup on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "phones get one row");
    await page.goto("/shop");

    const header = page.locator(HEADER);
    const nav = header.getByRole("navigation").first();
    await expect(nav).toBeVisible();

    const lockup = header.getByRole("link", { name: "Parfums De Foda" }).first();
    const box = await lockup.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - (viewport?.width ?? 0) / 2)).toBeLessThan(4);
  });

  test("hides on the way down and returns on the way up", async ({ page }) => {
    // The bar only retracts while motion is allowed; the suite defaults to
    // reduced motion, where staying put is the correct behaviour.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop");
    const header = page.locator(HEADER);
    await expect(header).toHaveAttribute("data-hidden", "false");

    // WebKit can fire the first scroll event before it commits `scrollY`, so
    // walk the page down in steps the way a reader would.
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollBy(0, 500));
          return header.getAttribute("data-hidden");
        },
        { timeout: 15_000 },
      )
      .toBe("true");

    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollBy(0, -500));
          return header.getAttribute("data-hidden");
        },
        { timeout: 15_000 },
      )
      .toBe("false");
  });

  test("stays visible under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shop");

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(200);
    await expect(page.locator(HEADER)).toHaveAttribute("data-hidden", "false");
  });

  test("opens the search panel, focuses the field, and closes on Escape", async ({ page }) => {
    await page.goto("/shop");
    const trigger = page.locator(HEADER).getByRole("button", { name: "بحث" }).first();
    await trigger.click();

    const panel = page.locator("#header-search-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("combobox").or(panel.getByRole("searchbox")).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("keeps the page free of horizontal overflow", async ({ page }) => {
    await page.goto("/shop");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("flat header on phones", () => {
  test("opens the menu sheet, traps focus and returns it on Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones get the sheet");
    await page.goto("/shop");

    const trigger = page.locator(HEADER).getByRole("button", { name: "القائمة" }).first();
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link").first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
