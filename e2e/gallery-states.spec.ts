import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The gallery states that only exist after an interaction: the cart drawer, the
 * search panel, the mobile menu, the size chooser, checkout with errors and the
 * not-found page. Plus the keyboard-only purchase path, reduced motion and a
 * 200% zoom reflow check.
 */

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

/** Presses Tab until the focused element satisfies the predicate. */
async function tabTo(page: Page, predicate: string, max = 70) {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((expression) => {
      const el = document.activeElement;
      if (!el) return false;
      // eslint-disable-next-line no-new-func
      return Boolean(new Function("el", `return ${expression}`)(el));
    }, predicate)) {
      return;
    }
  }
  throw new Error(`Tab never reached: ${predicate}`);
}

async function addToCart(page: Page) {
  await page.getByRole("button", { name: /أضف إلى السلة/ }).first().click();
  await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
}

test.describe("gallery states", () => {
  test("cart drawer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf020", { waitUntil: "load" });
    await addToCart(page);
    await expectNoViolations(page, "cart drawer");
  });

  test("search panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "load" });
    await expect(async () => {
      await page.getByRole("button", { name: "بحث" }).first().click();
      await expect(page.locator("#mobile-search-panel")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await page.locator("#mobile-search-panel").getByRole("combobox").first().fill("عود");
    await expectNoViolations(page, "search panel");
  });

  test("mobile menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "القائمة" }).click();
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
    await expectNoViolations(page, "mobile menu");
  });

  test("size chooser", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "load" });
    // A four-size product, so the quick-add opens the chooser instead of adding.
    const card = page.locator("[data-card]").filter({ hasText: "أفريكان ليذر" }).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.getByRole("button", { name: /إضافة سريعة|أضف إلى السلة/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expectNoViolations(page, "size chooser");
  });

  test("checkout with errors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf020", { waitUntil: "load" });
    await addToCart(page);
    await page.goto("/checkout", { waitUntil: "load" });
    await page.getByRole("button", { name: /تأكيد الطلب/ }).last().click();
    await expect(page.locator("#checkout-error-summary")).toBeVisible();
    await expectNoViolations(page, "checkout errors");
  });

  test("not found page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/does-not-exist", { waitUntil: "load" });
    await expectNoViolations(page, "404");
  });
});

test.describe("assistant (feature off)", () => {
  test("no launcher, no panel, /api/chat answers 404", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // With `features.assistant` off in data/settings.json, the floating
    // assistant must not render anywhere: no button, no dialog, no greeting.
    await expect(page.getByRole("button", { name: "اسأل المساعد" })).toHaveCount(0);
    await expect(page.locator("[data-advisor-launcher]")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "مساعد الذوق" })).toHaveCount(0);
    await expect(page.getByText(/أهلاً بيك/)).toHaveCount(0);

    const response = await page.request.post("/api/chat", {
      data: { messages: [{ role: "user", content: "عطر للصيف" }] },
    });
    expect(response.status()).toBe(404);
  });
});

test.describe("keyboard and motion", () => {
  test("keyboard only: size, add to cart, drawer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf020", { waitUntil: "load" });

    await tabTo(page, "el.getAttribute('role') === 'radio' && el.getAttribute('aria-checked') === 'true'");
    const before = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el.getAttribute("aria-label");
    });
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(async () =>
        page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
      )
      .not.toBe(before);

    await tabTo(page, "el.closest('[data-purchase-cta]') !== null");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
  });

  test("reduced motion removes the card transform", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "load" });
    const card = page.locator("[data-card][data-card-state='live']").first();
    await card.hover();
    await page.waitForTimeout(200);
    const transform = await card.locator("[data-card-stage] img").first().evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(transform).toBe("none");
  });

  test("reflows at 200% zoom without horizontal scroll", async ({ page }) => {
    for (const path of ["/", "/shop", "/product/pf020", "/checkout"]) {
      // 640px is a 1280px viewport at 200% zoom.
      await page.setViewportSize({ width: 640, height: 512 });
      await page.goto(path, { waitUntil: "load" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} overflows at 200% zoom`).toBeLessThanOrEqual(0);
    }
  });
});
