import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The card hover system.
 *
 * Every card lifts, gets a pointer spotlight, a stage edge, a contracting
 * ground shadow and a quick-add pill; a premium card adds the gold layer.
 *
 * The suite runs on the pointer project only, and with `reducedMotion:
 * "no-preference"` — the global config asks for reduced motion, so each motion
 * test opts back in explicitly.
 */

const LIVE_CARD = 'article[data-card-state="live"]';

async function withMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/shop", { waitUntil: "load" });
  await page.locator(LIVE_CARD).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

/** The transform of an element as `[a, b, c, d, tx, ty]`, or null. */
async function transform(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const value = getComputedStyle(element).transform;
    if (!value || value === "none") return null;
    return value.match(/-?[\d.]+/g)?.map(Number) ?? null;
  });
}

async function pseudoOpacity(page: Page, selector: string, pseudo: "::before" | "::after") {
  return page
    .locator(selector)
    .first()
    .evaluate((element, which) => Number(getComputedStyle(element, which).opacity), pseudo);
}

test.describe("card hover", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "pointer devices only");
  });

  test("a regular card lifts, lights its stage and grows the quick-add pill", async ({ page }) => {
    await withMotion(page);
    const card = page.locator(LIVE_CARD).first();
    const stage = card.locator("[data-stage]");
    const box = await card.boundingBox();
    expect(box).not.toBeNull();

    expect(await transform(page, `${LIVE_CARD}:first-of-type`)).toBeNull();

    // A real pointer move over the stage (not the centre) drives the spotlight.
    await page.mouse.move(box!.x + box!.width * 0.32, box!.y + box!.height * 0.3);
    await page.waitForTimeout(600);

    const lifted = await card.evaluate((element) => getComputedStyle(element).transform);
    expect(lifted).not.toBe("none");
    // translateY(-4px) → matrix ty is -4.
    expect(Math.round(Number(lifted.match(/-?[\d.]+/g)?.at(5)))).toBe(-4);

    expect(await pseudoOpacity(page, `${LIVE_CARD}:first-of-type`, "::after")).toBeGreaterThan(0);
    expect(await stage.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--card-mx").replace("px", "")))).toBeGreaterThan(10);
    expect(await stage.locator(".card-spot").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
    expect(await stage.locator(".card-edge").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);

    // The quick-add circle becomes a pill with its label.
    const button = card.locator(".quick-add-btn").first();
    await expect(card.locator(".quick-add-label").first()).toBeVisible();
    expect(await button.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(44);
    expect(await card.locator(".quick-add-label").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");

    // The name turns brand purple.
    const name = card.locator(".card-name").first();
    const colour = await name.evaluate((el) => getComputedStyle(el).color);
    expect(colour).not.toBe("rgb(29, 29, 31)");
  });

  test("the bottle lifts and its ground shadow tightens", async ({ page }) => {
    await withMotion(page);
    const card = page.locator(LIVE_CARD).first();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(600);

    const bottle = card.locator(".card-bottle").first();
    const matrix = await bottle.evaluate((el) => getComputedStyle(el).transform.match(/-?[\d.]+/g)?.map(Number) ?? []);
    expect(matrix.length).toBeGreaterThan(0);
    // translateY(-6px) scale(1.04)
    expect(Math.round(matrix.at(5) ?? 0)).toBe(-6);
    expect(Number(matrix[0] ?? 0)).toBeCloseTo(1.04, 2);

    const ground = card.locator("[data-ground]").first();
    const groundTransform = await ground.evaluate((el) => getComputedStyle(el).transform);
    expect(groundTransform).toContain("0.85");
  });

  test("hovering a card never moves its neighbours", async ({ page }) => {
    await withMotion(page);
    const cards = page.locator("article");
    const boxesBefore = await cards.evaluateAll((nodes) =>
      nodes.slice(0, 8).map((node) => {
        const rect = node.getBoundingClientRect();
        return [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)];
      }),
    );

    const target = page.locator(LIVE_CARD).nth(1);
    const box = await target.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(600);

    const boxesAfter = await cards.evaluateAll((nodes) =>
      nodes.slice(0, 8).map((node) => {
        const rect = node.getBoundingClientRect();
        return [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)];
      }),
    );
    // The hovered card (index 1) may translate; every other card may not.
    boxesBefore.forEach((box, index) => {
      if (index === 1) return;
      expect(boxesAfter[index], `card ${index} moved`).toEqual(box);
    });
  });

  test("a premium card adds the gold glow and one ring sweep", async ({ page }) => {
    await withMotion(page);
    const premium = page.locator('article:has([data-premium="true"])').first();
    const box = await premium.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(250);

    expect(
      await premium.evaluate((el) => Number(getComputedStyle(el, "::before").opacity)),
    ).toBeGreaterThan(0);

    const ring = await premium
      .locator(".premium-frame")
      .first()
      .evaluate((el) => getComputedStyle(el, "::after").animationName);
    expect(ring).toBe("premium-ring-sweep");
  });

  test("keyboard focus shows the same state without the pointer light", async ({ page }) => {
    await withMotion(page);
    const card = page.locator(LIVE_CARD).first();
    await card.locator(".card-name").first().focus();
    await page.waitForTimeout(500);

    const lifted = await card.evaluate((el) => getComputedStyle(el).transform);
    expect(lifted).not.toBe("none");
    expect(await pseudoOpacity(page, `${LIVE_CARD}:first-of-type`, "::after")).toBeGreaterThan(0);
    expect(
      await card.locator(".card-spot").evaluate((el) => Number(getComputedStyle(el).opacity)),
    ).toBe(0);
    // The focus ring is still drawn by the link itself.
    expect(await card.locator(".card-name").first().evaluate((el) => getComputedStyle(el).outlineStyle)).toBeTruthy();
  });

  test("reduced motion removes the lift but keeps an instant edge", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shop", { waitUntil: "load" });
    await page.locator(LIVE_CARD).first().waitFor();

    const card = page.locator(LIVE_CARD).first();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(400);

    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(await card.locator(".card-bottle").first().evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    const duration = await card
      .locator(".card-spot")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.05);
  });

  test("an unavailable card does not lift", async ({ page }) => {
    await withMotion(page);
    const staticCard = page.locator('article[data-card-state="static"]').first();
    test.skip((await staticCard.count()) === 0, "no unavailable product in this catalogue");

    const box = await staticCard.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(400);
    expect(await staticCard.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(await staticCard.locator(".card-spot").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
  });

  test("premium and regular cards keep the same height while hovered", async ({ page }) => {
    await withMotion(page);
    const cards = page.locator("article");
    const premium = page.locator('article:has([data-premium="true"])').first();
    const box = await premium.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(500);

    const rows = await cards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: Math.round(rect.top / 8) * 8, height: rect.height };
      }),
    );
    const byRow = new Map<number, number[]>();
    for (const card of rows) byRow.set(card.top, [...(byRow.get(card.top) ?? []), card.height]);
    for (const heights of byRow.values()) {
      if (heights.length < 2) continue;
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    }
  });

  test("the hovered grid is still accessible", async ({ page }) => {
    await withMotion(page);
    const box = await page.locator(LIVE_CARD).first().boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("card hover on touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test("a touch screen gets no hover transform", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop", { waitUntil: "load" });
    const card = page.locator(LIVE_CARD).first();
    await card.waitFor();

    // Tap the meta line, not the stage: the stage is an overlay link and a tap
    // there would navigate away mid-assertion.
    await card.locator("p").first().tap();

    // The 120 ms press-scale settles back to `none` on its own; poll for that
    // rather than sampling mid-transition. Nothing else may move the card.
    await expect
      .poll(async () => card.evaluate((el) => getComputedStyle(el).transform), {
        timeout: 3000,
      })
      .toBe("none");
    expect(await card.locator(".card-spot").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
    // The quick-add control stays the plain 44px circle.
    expect(
      await card.locator(".quick-add-btn").first().evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(46);
  });
});
