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

test.describe("advisor launcher", () => {
  test("never auto-opens, opens one dialog, and returns focus on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // The old greeting popup appeared on a timer; the redesign only opens on
    // an explicit click, so nothing may exist before one.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/أهلاً بيك/)).toHaveCount(0);

    const launcher = page.getByRole("button", { name: "اسأل المساعد" });
    await expect(launcher).toBeVisible();
    await expect(page.locator("[data-advisor-launcher] button")).toHaveCount(1);
    const box = await launcher.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBe(24);
    expect(box!.height).toBe(48);
    expect(box!.width).toBeGreaterThan(130);

    const dialog = page.getByRole("dialog", { name: "مساعد الذوق" });
    // WebKit can answer the first tap before hydration attaches the handler;
    // retry the click, as the search specs do, instead of assuming one click.
    await expect(async () => {
      await launcher.click();
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await expect(dialog.getByRole("heading", { name: "مساعد الذوق" })).toBeVisible();
    await expect(dialog.getByText("يرشّح لك العطر في ثوانٍ")).toBeVisible();
    await expect(dialog.getByText(/أهلاً بيك/)).toBeVisible();

    // The input takes focus, so typing works without another click.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label")))
      .toBe("رسالتك");

    // The three gold suggestions are visible until the first message.
    await expect(
      dialog.getByRole("button", { name: /^(رجالي للصيف|هدية|ثبات قوي)$/ }),
    ).toHaveCount(3);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(launcher).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const root = document.querySelector("[data-advisor-launcher]");
          return root ? getComputedStyle(root).opacity : "0";
        }),
      )
      .toBe("1");
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
