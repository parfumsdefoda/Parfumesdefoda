import { test, expect } from "@playwright/test";

/**
 * The storefront is light only. A browser (or extension) that forces dark mode
 * must still paint the ivory paper: `color-scheme: only light` in globals.css
 * and the two meta tags in layout.tsx are what enforce it as far as the
 * platform allows.
 */

/** WCAG relative luminance of an `rgb()`/`rgba()` string, 0 (black) to 1. */
function luminance(color: string): number {
  const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  if (channels.length < 3 || color.startsWith("rgba(0, 0, 0, 0")) return 0;
  const [r, g, b] = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test.describe("light-only surfaces", () => {
  test.use({ colorScheme: "dark" });

  test("forced dark mode keeps the paper background on the catalogue and the homepage", async ({
    page,
  }) => {
    for (const path of ["/", "/shop"]) {
      await page.goto(path);
      const probe = await page.evaluate(() => {
        // The body paints the paper itself (globals.css), so read that.
        const background = getComputedStyle(document.body).backgroundColor;
        return {
          background,
          scheme: getComputedStyle(document.documentElement).colorScheme,
          meta: document.querySelector('meta[name="color-scheme"]')?.getAttribute("content"),
        };
      });
      expect(probe.scheme.replace(/\s+/g, " ").trim(), `${path}: color-scheme`).toBe("light only");
      expect(probe.meta, `${path}: meta color-scheme`).toBe("light only");
      expect(luminance(probe.background), `${path}: paper luminance`).toBeGreaterThan(0.6);
    }
  });
});
