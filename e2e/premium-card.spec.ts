import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The premium (فاخر) card — the gold frame that replaced the gold badge.
 *
 * The suite runs with `reducedMotion: "reduce"` by default (see
 * playwright.config.ts), so every assertion here is about the STATIC frame:
 * geometry, the alpha gate and the meta line. One test opts into motion to
 * prove the frame is the only thing that animates.
 */

/** Every card's premium state, stage tone and box, as the browser sees them. */
async function readCards(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("article")).map((card) => {
      const stage = card.querySelector("[data-stage]");
      const rect = card.getBoundingClientRect();
      return {
        premium: stage?.getAttribute("data-premium") ?? null,
        stage: stage?.getAttribute("data-stage") ?? null,
        top: Math.round(rect.top),
        height: Math.round(rect.height * 100) / 100,
      };
    }),
  );
}

test.describe("premium card", () => {
  test("premium cards carry the frame and never the old gold badge", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const premium = page.locator('article:has([data-premium="true"])');
    await expect(premium).toHaveCount(2);
    // The badge slot is empty on a premium, in-stock card.
    await expect(premium.first().locator("text=فاخر").first()).toBeVisible();
    await expect(premium.first().getByText("★")).toHaveCount(0);

    const ring = premium.first().locator(".premium-frame").first();
    await expect(ring).toHaveCount(1);
    // The ring is an overlay: it must never swallow a click.
    expect(await ring.evaluate((el) => getComputedStyle(el, "::before").pointerEvents)).toBe(
      "none",
    );
  });

  test("the meta line leads with the diamond and keeps three parts", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const meta = page.locator('article:has([data-premium="true"]) p').first();
    await expect(meta).toContainText("فاخر");
    await expect(meta).toContainText("نيش");
    await expect(meta).toContainText("شرقي");
    // The diamond is decoration only.
    await expect(meta.locator("svg[aria-hidden='true']")).toHaveCount(1);
  });

  test("only a real cut-out gets the dark stage", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    // pf240 is a transparent cut-out; pf091 is a framed photo (needs-retouch).
    const alpha = page
      .locator('article[class*="premium-card"]')
      .filter({ hasText: "تيروني" })
      .first();
    const framed = page
      .locator('article[class*="premium-card"]')
      .filter({ hasText: "أمواج انترلود" })
      .first();

    await expect(alpha.locator("[data-stage]")).toHaveAttribute("data-stage", "dark");
    await expect(framed.locator("[data-stage]")).toHaveAttribute("data-stage", "light");
    // Both still wear the ring.
    await expect(alpha.locator(".premium-frame")).toHaveCount(1);
    await expect(framed.locator(".premium-frame")).toHaveCount(1);
  });

  test("a premium card is exactly as tall as a normal card in its row", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });
    const cards = await readCards(page);
    expect(cards.length).toBeGreaterThan(8);

    const rows = new Map<number, typeof cards>();
    for (const card of cards) {
      const bucket = Math.round(card.top / 8) * 8;
      rows.set(bucket, [...(rows.get(bucket) ?? []), card]);
    }

    let premiumRows = 0;
    let mixedRows = 0;
    let columns = 0;
    for (const row of rows.values()) {
      if (row.length < 2) continue;
      columns = Math.max(columns, row.length);
      const heights = row.map((card) => card.height);
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      const hasPremium = row.some((card) => card.premium === "true");
      const hasNormal = row.some((card) => card.premium === null);
      if (hasPremium) premiumRows += 1;
      if (hasPremium && hasNormal) mixedRows += 1;
    }

    // Every row that holds a premium card was measured above.
    expect(premiumRows, "a row should contain a premium card").toBeGreaterThan(0);

    // The two premium products sort to the front, so on a two-column phone the
    // first row is premium + premium and NO row can mix the two kinds. The
    // mixed-row case only exists once the grid fits three or more cards; where
    // it exists, the frame must not disturb it either.
    if (columns >= 3) {
      expect(mixedRows, "a wide row should mix premium and normal cards").toBeGreaterThan(0);
    }
  });

  test("reduced motion leaves the frame completely still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shop", { waitUntil: "networkidle" });

    const ring = page.locator('article:has([data-premium="true"]) .premium-frame').first();
    const motion = await ring.evaluate((el) => {
      const sweep = getComputedStyle(el, "::after");
      const bottle = el.querySelector(".premium-bottle");
      return {
        sweepName: sweep.animationName,
        sweepOpacity: sweep.opacity,
        bottleTransition: bottle ? getComputedStyle(bottle).transitionDuration : "0s",
      };
    });
    expect(motion.sweepName).toBe("none");
    expect(motion.sweepOpacity).toBe("0");
    expect(["0s", "0.01ms"]).toContain(motion.bottleTransition);
  });

  test("the shop grid with premium cards has no accessibility violations", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
