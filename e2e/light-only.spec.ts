import { test, expect } from "@playwright/test";

/**
 * The gallery is light only: warm ivory paper under every scheme, enforced by
 * `color-scheme: only light` and the two meta tags as far as a browser allows.
 */

/** WCAG relative luminance of an `rgb()`/`rgba()` string, 0 to 1. */
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

  test("forced dark mode keeps the paper background", async ({ page }) => {
    for (const path of ["/", "/shop"]) {
      await page.goto(path);
      const probe = await page.evaluate(() => ({
        background: getComputedStyle(document.body).backgroundColor,
        scheme: getComputedStyle(document.documentElement).colorScheme,
        meta: document.querySelector('meta[name="color-scheme"]')?.getAttribute("content"),
      }));
      expect(probe.scheme.replace(/\s+/g, " ").trim(), `${path}: color-scheme`).toBe("light only");
      expect(probe.meta, `${path}: meta color-scheme`).toBe("light only");
      expect(luminance(probe.background), `${path}: paper luminance`).toBeGreaterThan(0.6);
    }
  });
});
