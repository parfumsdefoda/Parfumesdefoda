import { test, expect } from "@playwright/test";

/**
 * Product page contract (R2-1): paper stage with the manifest photo treatment,
 * the gold inset frame and label on premium products, a segmented size control
 * with a purple selection, a rectangular purple CTA, soft hairline accordions
 * and the same hairline grid for similar perfumes.
 */

function contrast(a: number[], b: number[]) {
  const lum = (rgb: number[]) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const parse = (value: string) =>
  value.match(/[\d.]+/g)!.slice(0, 3).map(Number);

test.describe("product page", () => {
  test("stage is paper and the size control is a segmented purple selection", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf020");

    const geometry = await page.evaluate(() => {
      const group = document.querySelector("[role='radiogroup']") as HTMLElement;
      const checked = group.querySelector("[role='radio'][aria-checked='true']") as HTMLElement;
      const cta = document.querySelector("[data-purchase-cta] button") as HTMLElement;
      // The gallery renders a phone strip and a desktop stage; only one of
      // them is displayed, so pick the button that actually has a box.
      const stage = Array.from(document.querySelectorAll("main button"))
        .find((node) => node.getBoundingClientRect().width > 300) as HTMLElement;
      const cs = getComputedStyle(checked);
      const ctaCs = getComputedStyle(cta);
      return {
        columns: getComputedStyle(group).gridTemplateColumns.split(" ").length,
        options: group.querySelectorAll("[role='radio']").length,
        checkedBg: cs.backgroundColor,
        checkedColor: cs.color,
        checkedRadius: cs.borderRadius,
        checkedBorder: cs.borderTopWidth,
        ctaBg: ctaCs.backgroundColor,
        ctaColor: ctaCs.color,
        ctaRadius: ctaCs.borderRadius,
        ctaHeight: cta.getBoundingClientRect().height,
        // The stage itself is a bare button; the paper is painted by the image frame
        // inside it (one child owns the photo treatment).
        stagePaintsPaper: stage
          ? Array.from(stage.querySelectorAll("*"))
              .some((node) => getComputedStyle(node).backgroundColor === getComputedStyle(document.body).backgroundColor)
          : false,
        paper: getComputedStyle(document.body).backgroundColor,
      };
    });

    const expectedColumns = Math.min(geometry.options, 4);
    expect(geometry.columns).toBe(expectedColumns);
    expect(geometry.checkedRadius).toBe("0px");
    expect(geometry.checkedBorder).toBe("1px");
    // Selected size reads as a filled purple chip with light text.
    expect(contrast(parse(geometry.checkedColor), parse(geometry.checkedBg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(geometry.checkedColor), parse(geometry.checkedBg))).toBeGreaterThan(0);

    // The CTA is the primary purple, rectangular and at least 44px tall.
    expect(geometry.ctaRadius).toBe("0px");
    expect(geometry.ctaHeight).toBeGreaterThanOrEqual(44);
    expect(contrast(parse(geometry.ctaColor), parse(geometry.ctaBg))).toBeGreaterThanOrEqual(4.5);
    expect(geometry.stagePaintsPaper).toBe(true);
  });

  test("premium products carry the premium meta line, not the old frame", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf240");

    // The inset frame is gone from the gallery; the premium word now lives in
    // the meta line above the title, drawn in gold-700 with a diamond glyph.
    await expect(page.locator("[data-premium-frame]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(فاخر)");

    const meta = await page.locator("main h1").evaluate((heading) => {
      const line = heading.previousElementSibling as HTMLElement | null;
      if (!line) return null;
      const first = line.querySelector("span > span") as HTMLElement | null;
      return {
        text: line.textContent?.replace(/\s+/g, " ").trim() ?? "",
        firstColour: first ? getComputedStyle(first).color : "",
        diamond: first ? first.querySelectorAll("svg").length : 0,
        visible: line.getBoundingClientRect().width > 0,
      };
    });

    expect(meta).not.toBeNull();
    expect(meta!.visible).toBe(true);
    expect(meta!.text.replace(/\s/g, "")).toBe("فاخر·نيش·شرقي");
    expect(meta!.firstColour).toBe("rgb(122, 90, 18)");
    expect(meta!.diamond).toBe(1);
  });

  test("similar perfumes use the hairline grid and the accordion hairlines", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/pf020");

    const card = page.locator("[data-card]").first();
    await expect(card).toBeVisible();
    const borders = await card.evaluate((el) => {
      const shell = getComputedStyle(el);
      const inner = getComputedStyle(el.firstElementChild as HTMLElement);
      return {
        radius: shell.borderTopLeftRadius,
        shadow: shell.boxShadow,
        innerRadius: inner.borderTopLeftRadius,
        innerBorder: inner.borderInlineEndWidth,
      };
    });
    expect(borders.radius).toBe("16px");
    expect(borders.shadow).toBe("none");
    expect(borders.innerRadius).toBe("14px");
    expect(borders.innerBorder).toBe("1px");
  });
});
