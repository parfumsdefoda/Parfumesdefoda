import { test, expect, type Locator } from "@playwright/test";

/**
 * Card hover in the editorial language.
 *
 * The old card lifted a rounded stage, lit a spotlight and grew a purple pill.
 * None of that exists now: the cell is flat paper inside a hairline grid, the
 * bottle scales 1.03 under a fine pointer, and the name gains a 1px underline.
 * Reduced motion leaves everything still.
 */

const CARD = "[data-card]";

/** The bottle: the card's first image. */
function bottle(card: Locator) {
  return card.locator("[data-card-stage] img").first();
}

/** Width of the bottle in px, after layout has settled. */
async function bottleWidth(card: Locator) {
  const box = await bottle(card).boundingBox();
  return box?.width ?? 0;
}

test.describe("card hover", () => {
  test("a card scales its bottle and underlines the name under a fine pointer", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "hover is a fine-pointer state");
    await page.goto("/shop");

    const card = page.locator(CARD).first();
    await card.scrollIntoViewIfNeeded();
    const before = await bottleWidth(card);

    await card.hover();

    // 1.03 scale: the bottle is measurably wider, which is what the eye sees.
    await expect.poll(() => bottleWidth(card)).toBeGreaterThan(before * 1.01);
    await expect(card.locator("h3 a").first()).toHaveCSS("text-decoration-line", "underline");
  });

  test("reduced motion keeps the bottle still", async ({ page, isMobile }) => {
    test.skip(isMobile, "hover is a fine-pointer state");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shop");

    const card = page.locator(CARD).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(250);

    const scaled = await card.evaluate((el) =>
      Array.from(el.querySelectorAll("[data-card-stage] *")).some((node) => {
        const transform = getComputedStyle(node).transform;
        if (transform === "none") return false;
        const matrix = new DOMMatrixReadOnly(transform);
        return Math.abs(matrix.a - 1) > 0.001 || Math.abs(matrix.d - 1) > 0.001;
      }),
    );
    expect(scaled).toBe(false);
  });

  test("the cell advertises no elevation: no radius, no shadow", async ({ page }) => {
    await page.goto("/shop");
    const card = page.locator(CARD).first();
    await card.scrollIntoViewIfNeeded();

    const style = await card.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { radius: computed.borderTopLeftRadius, shadow: computed.boxShadow };
    });

    expect(style.radius).toBe("0px");
    expect(style.shadow === "none" || style.shadow === "").toBeTruthy();
  });

  test("the quick-add control is still reachable from the keyboard", async ({ page }) => {
    await page.goto("/shop");
    const card = page.locator(CARD).first();
    await card.scrollIntoViewIfNeeded();

    const quickAdd = card.getByRole("button").filter({ hasNotText: /^$/ }).first();
    await expect(quickAdd).toBeVisible();
    await quickAdd.focus();
    await expect(quickAdd).toBeFocused();
  });
});
