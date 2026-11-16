import { expect, test, type Page } from "@playwright/test";

/**
 * The single-row header.
 *
 * 76px on white, sticky, one palette: logo at the inline start, the links in
 * the centre and search/cart/WhatsApp at the inline end. The suite runs with
 * `reducedMotion: "reduce"` globally (playwright.config.ts), so the tests that
 * are ABOUT motion opt back in with `emulateMedia`.
 */

const MENU = "القائمة";

async function hidden(page: Page) {
  return page.locator("header.site-header").getAttribute("data-hidden");
}

test.describe("single-row header", () => {
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





  test("is one 76px sticky row with no overlap from 1024 to 1440", async ({ page }) => {
    test.setTimeout(90_000);
    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/shop", { waitUntil: "networkidle" });

      const header = page.locator("header.site-header");
      await expect(header).toHaveCount(1);
      const g = await header.evaluate((el) => {
        const nav = el.querySelector("nav") as HTMLElement;
        const logo = el.querySelector("a[aria-label]") as HTMLElement;
        const actions = nav.parentElement?.lastElementChild as HTMLElement;
        const brand = logo.lastElementChild as HTMLElement;
        const whatsapp = el.querySelector('a[href*="wa.me"]') as HTMLElement;
        const box = (node: Element) => node.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          height: box(el).height,
          rowHeight: (el.firstElementChild as HTMLElement).getBoundingClientRect().height,
          position: style.position,
          background: style.backgroundColor,
          borderBottom: style.borderBottomWidth,
          logoStart: box(logo).left,
          navEnd: box(nav).right,
          navStart: box(nav).left,
          actionsEnd: box(actions).right,
          navGap: getComputedStyle(nav).columnGap,
          brandSize: getComputedStyle(brand).fontSize,
          brandTracking: getComputedStyle(brand).letterSpacing,
          whatsappWidth: box(whatsapp).width,
          links: nav.querySelectorAll("a").length,
          houses: Array.from(nav.querySelectorAll("button")).filter((b) =>
            b.textContent?.includes("الدور"),
          ).length,
          brand: brand.textContent?.trim(),
        };
      });

      expect(g.height, `${width}px header height`).toBe(76);
      // The 1px bottom border sits inside the 76px box; the row fills the rest.
      expect(g.rowHeight, `${width}px row height`).toBe(g.height - 1);
      expect(g.position, `${width}px position`).toBe("sticky");
      expect(g.background, `${width}px background`).toBe("rgb(255, 255, 255)");
      expect(g.borderBottom, `${width}px border`).toBe("1px");
      expect(g.brand).toBe("PARFUMS DE FODA");
      expect(g.links, `${width}px nav links`).toBe(6);
      expect(g.houses, `${width}px houses menu`).toBe(1);

      // RTL: the logo is at the inline start (right), the actions at the end
      // (left), and the centred nav never enters either neighbour's box.
      expect(g.logoStart - g.navEnd, `${width}px logo/nav gap`).toBeGreaterThanOrEqual(12);
      expect(g.navStart - g.actionsEnd, `${width}px nav/actions gap`).toBeGreaterThanOrEqual(12);

      if (width < 1280) {
        expect(g.navGap).toBe("12px");
        expect(g.brandSize).toBe("16px");
        expect(g.brandTracking).toBe("3px");
        // Icon-only WhatsApp pill: no label before xl.
        expect(g.whatsappWidth).toBeLessThan(60);
      } else {
        expect(g.navGap).toBe("20px");
        expect(g.brandSize).toBe("18px");
        expect(g.brandTracking).toBe("4px");
        expect(g.whatsappWidth).toBeGreaterThanOrEqual(120);
      }
    }
  });

  test("on a phone keeps the logo and actions on one row without the nav", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    const header = page.locator("header.site-header");
    const g = await header.evaluate((el) => {
      const nav = el.querySelector("nav") as HTMLElement;
      const logo = el.querySelector("a[aria-label]") as HTMLElement;
      const brand = logo.lastElementChild as HTMLElement;
      return {
        height: el.getBoundingClientRect().height,
        navDisplay: getComputedStyle(nav).display,
        brandDisplay: getComputedStyle(brand).display,
        logoLeft: logo.getBoundingClientRect().left,
        menu: el.querySelector('[aria-label="القائمة"]')?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(g.height).toBe(76);
    expect(g.navDisplay).toBe("none");
    expect(g.brandDisplay).toBe("none");
    expect(g.menu).toBeGreaterThanOrEqual(44);
    expect(g.logoLeft).toBeGreaterThan(200);

    await page.getByRole("button", { name: "القائمة" }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("link", { name: "المتجر" }),
    ).toHaveAttribute("href", "/shop");
  });

  test("hides on scroll down and returns on scroll up", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // The direction is a two-sample reading: one jump that lands before the
    // header's scroll listener is attached has no previous position and cannot
    // read as "down" (WebKit under load hydrates after the jump). Alternate
    // top/bottom until the handler answers; the assertion itself is unchanged.
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.evaluate(() => window.scrollTo(0, 900));
          return hidden(page);
        },
        { timeout: 5000 },
      )
      .toBe("true");

    // Same two-sample reading for the way back up: the jump starts from the
    // poll's own 900, so the last direction the listener sees is always up.
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollTo(0, 700));
          await page.evaluate(() => window.scrollTo(0, 500));
          return hidden(page);
        },
        { timeout: 5000 },
      )
      .toBe("false");
  });

  test("stays put while the search has focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // Focus first (the bar is visible at the top), then scroll: an open search
    // must keep the header on screen even while the page scrolls down.
    // Under load the trigger can be clicked before hydration attaches its
    // handler, so open the panel with a retry rather than a single click.
    await expect(async () => {
      await page.getByRole("button", { name: "بحث" }).first().click();
      await expect(page.locator("#mobile-search-panel")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await page.locator("#mobile-search-panel").getByRole("combobox").first().click();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(500);
    expect(await hidden(page)).toBe("false");
  });

  test("search is a keyboard combobox: arrows move, Enter opens, Escape closes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    // Under load the trigger can be clicked before hydration attaches its
    // handler, so open the panel with a retry rather than a single click.
    await expect(async () => {
      await page.getByRole("button", { name: "بحث" }).first().click();
      await expect(page.locator("#mobile-search-panel")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const input = page.locator("#mobile-search-panel").getByRole("combobox").first();
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




});
