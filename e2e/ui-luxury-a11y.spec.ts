import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Axe over the states the boutique phase introduced: the single-row header, the
 * premium card (gradient shell + glow), the PDP gallery stage and the mobile
 * menu sheet. Nothing here replaces the whole-site axe run in storefront.spec.ts —
 * it pins the surfaces that changed, so a future tweak cannot quietly drop
 * contrast or a landmark.
 */

/** Fails with the offending rules and nodes spelled out. */
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
  expect(summary, `${label}: ${summary.join("\n")}`).toEqual([]);
}

test.describe("ui-luxury accessibility", () => {
  test("homepage with the paper header", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("header.site-header")).toBeVisible();
    await expectNoViolations(page, "homepage (paper header)");
  });

  test("catalogue with the paper header and the card grid", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });
    await expect(page.locator("header.site-header")).toBeVisible();
    await expectNoViolations(page, "catalogue (paper header)");
  });

  test("premium PDP with the dark gallery stage", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf240", { waitUntil: "networkidle" });
    await expectNoViolations(page, "premium PDP");
  });

  test("mobile menu sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "القائمة" }).click();
    await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
    await expectNoViolations(page, "mobile menu sheet");
  });

  test("open search suggestions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });
    await expect(async () => {
      await page.getByRole("button", { name: "بحث" }).first().click();
      await expect(page.locator("#mobile-search-panel")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const input = page.locator("#mobile-search-panel").getByRole("combobox").first();
    await input.click();
    await input.fill("عود");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expectNoViolations(page, "search suggestions");
  });

  test("catalogue toolbar at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/shop", { waitUntil: "networkidle" });
    await expectNoViolations(page, "catalogue toolbar (mobile)");
  });
});
