import { expect, test, type Page } from "@playwright/test";

/**
 * The floating glass header.
 *
 * Two tones, one capsule, no product imagery. The suite runs with
 * `reducedMotion: "reduce"` globally (playwright.config.ts), so the tests that
 * are ABOUT motion opt back in with `emulateMedia`.
 */

const MENU = "القائمة";

async function tone(page: Page) {
  return page.locator("header.site-header").getAttribute("data-tone");
}

async function hidden(page: Page) {
  return page.locator("header.site-header").getAttribute("data-hidden");
}

/**
 * The capsule's painted alpha.
 *
 * Chrome serialises a `color-mix(… transparent)` as `color(srgb 1 1 1 / 0.88)`
 * and older engines as `rgba(…, 0.88)`, so both spellings are read.
 */
async function capsuleAlpha(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("header > div > div") as Element;
    const color = getComputedStyle(el).backgroundColor;
    const legacy = color.match(/rgba?\(([^)]+)\)/);
    if (legacy) {
      const parts = legacy[1].split(",").map((part) => Number(part.trim()));
      return parts.length === 4 ? parts[3] : 1;
    }
    const modern = color.match(/\/\s*([\d.]+)\s*\)/);
    return modern ? Number(modern[1]) : 1;
  });
}

test.describe("floating header", () => {
  test("carries no product imagery anywhere in the header", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    await expect(header).toHaveCount(1);
    // No <img> at all: the brand mark is a CSS background.
    await expect(header.locator("img")).toHaveCount(0);

    // And no background-image pointing at the catalogue either.
    const productBackgrounds = await header.evaluate((element) =>
      Array.from(element.querySelectorAll<HTMLElement>("*"))
        .map((node) => getComputedStyle(node).backgroundImage)
        .filter((value) => value.includes("/products/")),
    );
    expect(productBackgrounds).toEqual([]);
  });

  test("is dark over the hero and light everywhere else", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    expect(await tone(page)).toBe("dark");

    // Past the hero: the island flips the attribute, no re-render.
    await page.evaluate(() => window.scrollTo(0, 1400));
    await expect.poll(async () => tone(page), { timeout: 5000 }).toBe("light");

    // And back up again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => tone(page), { timeout: 5000 }).toBe("dark");

    await page.goto("/shop", { waitUntil: "networkidle" });
    expect(await tone(page)).toBe("light");
  });

  test("renders the correct tone in the server HTML (no flash)", async ({ page }) => {
    const response = await page.goto("/shop");
    const html = (await response?.text()) ?? "";
    // The header's first paint is already the light tone on a non-hero route.
    expect(html).toMatch(/data-tone="light"/);

    const home = await page.goto("/");
    const homeHtml = (await home?.text()) ?? "";
    expect(homeHtml).toMatch(/data-tone="dark"/);
  });

  test("hides on scroll down and returns on scroll up", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop", { waitUntil: "networkidle" });

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(async () => hidden(page), { timeout: 5000 }).toBe("true");

    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(async () => hidden(page), { timeout: 5000 }).toBe("false");
  });

  test("stays put while the search has focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // Focus first (the bar is visible at the top), then scroll: an open search
    // must keep the capsule on screen even while the page scrolls down.
    await page.getByRole("combobox").first().click();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(500);
    expect(await hidden(page)).toBe("false");
  });

  test("search is a keyboard combobox: arrows move, Enter opens, Escape closes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    const input = page.getByRole("combobox").first();
    await input.click();
    await input.fill("عود");
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", /option-0/);

    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    // The next keystroke after Escape brings the list back (the field keeps
    // focus, so a dismissed list must never stay dead while someone types).
    await input.press("Backspace");
    await expect(input).toHaveAttribute("aria-expanded", "true");

    // Enter on the first suggestion navigates to a product.
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", /option-0/);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/product\//, { timeout: 10_000 });
  });

  test("mobile sheet traps focus, closes on Escape and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });

    const trigger = page.getByRole("button", { name: MENU });
    await trigger.click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible();
    await expect
      .poll(async () => sheet.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);

    // Tab from the last focusable wraps to the first, and never leaves.
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press("Tab");
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect
      .poll(async () => trigger.evaluate((el) => el === document.activeElement))
      .toBe(true);
  });

  test("never overflows horizontally at any width", async ({ page }) => {
    test.setTimeout(60_000);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/", "/shop"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("adds no layout shift", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{
          hadRecentInput: boolean;
          value: number;
        }>) {
          if (!entry.hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    for (const route of ["/", "/shop"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `${route} CLS`).toBeLessThanOrEqual(0.01);
    }
  });

  test("the capsule has a solid fallback for reduced transparency and no blur", async ({
    page,
  }) => {
    await page.goto("/shop", { waitUntil: "networkidle" });

    const state = await page.evaluate(() => ({
      reduceTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
      rules: Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
        .join("\n"),
    }));
    const alpha = await capsuleAlpha(page);

    // The default token is translucent glass...
    expect(state.rules).toMatch(/--header-surface:\s*color-mix\([^;]*transparent\)/);
    // ...and both fallbacks (no backdrop-filter, reduced transparency) replace
    // it with a solid surface rather than leaving text on an unknown backdrop.
    expect(state.rules).toContain("prefers-reduced-transparency");
    expect(state.rules).toMatch(/--header-surface:\s*var\(--color-surface\)/);

    // Whatever the engine reports, the painted capsule agrees with it.
    if (state.reduceTransparency) expect(alpha).toBe(1);
    else expect(alpha).toBeLessThan(1);
  });

  test("is glass when transparency is allowed and solid when it is not", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Emulation.setEmulatedMedia is a Chromium protocol command",
    );
    await page.goto("/shop", { waitUntil: "networkidle" });

    const cdp = await context.newCDPSession(page);
    const emulate = (value: "no-preference" | "reduce") =>
      cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value }],
      });

    // `Emulation.setEmulatedMedia` lands asynchronously in the renderer, so the
    // painted alpha is polled rather than read on the next line; the assertion
    // itself is unchanged (glass when allowed, solid when not).
    await emulate("no-preference");
    await expect.poll(() => capsuleAlpha(page), { timeout: 5000 }).toBeLessThan(1);

    await emulate("reduce");
    await expect.poll(() => capsuleAlpha(page), { timeout: 5000 }).toBe(1);
  });
});
