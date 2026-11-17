import { test, expect } from "@playwright/test";

/**
 * The catalogue card after the boutique redesign.
 *
 * Every cell is a 14px inner card inside a 2px shell: the regular shell is
 * transparent and the premium one is the gold gradient with a glow, so both
 * rows share one height. The image stage is square, the text is centred under
 * it, and the compact quick-add appears on hover without moving the card.
 * Premium adds the star badge and an always-visible full-width add button.
 */

test.describe("gallery card", () => {
  test("regular cell is a 2px shell around a 14px card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");

    const cell = page.locator("[data-card]:not(:has([data-premium-badge]))").first();
    await expect(cell).toBeVisible();

    const geometry = await cell.evaluate((el) => {
      const inner = el.firstElementChild as HTMLElement;
      const image = el.querySelector("[data-card-stage]") as HTMLElement;
      const name = el.querySelector("h3") as HTMLElement;
      const price = el.querySelector("[data-card-price]") as HTMLElement;
      const action = el.querySelector("[data-card-action]") as HTMLElement;
      const cellBox = el.getBoundingClientRect();
      const innerBox = inner.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      const nameBox = name.getBoundingClientRect();
      const priceBox = price.getBoundingClientRect();
      const cellStyle = getComputedStyle(el);
      const innerStyle = getComputedStyle(inner);
      return {
        cellWidth: cellBox.width,
        cellRadius: cellStyle.borderTopLeftRadius,
        cellPadding: cellStyle.paddingTop,
        cellShadow: cellStyle.boxShadow,
        innerWidth: innerBox.width,
        innerRadius: innerStyle.borderTopLeftRadius,
        innerBorder: innerStyle.borderTopWidth,
        innerBorderColour: innerStyle.borderTopColor,
        imageWidth: imageBox.width,
        imageHeight: imageBox.height,
        imageTop: imageBox.top - cellBox.top,
        nameCentreDelta: Math.abs(nameBox.left + nameBox.width / 2 - (cellBox.left + cellBox.width / 2)),
        priceCentreDelta: Math.abs(priceBox.left + priceBox.width / 2 - (cellBox.left + cellBox.width / 2)),
        actionHeight: action.getBoundingClientRect().height,
        nameSize: getComputedStyle(name).fontSize,
        nameWeight: getComputedStyle(name).fontWeight,
      };
    });

    // The 2px shell and the 14px inner are both real, so rows stay equal.
    expect(geometry.cellRadius).toBe("16px");
    expect(geometry.cellPadding).toBe("2px");
    expect(geometry.innerRadius).toBe("14px");
    expect(geometry.innerWidth).toBeCloseTo(geometry.cellWidth - 4, 0);

    // Regular cells keep the hairline and no elevation.
    expect(geometry.cellShadow).toBe("none");
    expect(geometry.innerBorder).toBe("1px");
    expect(geometry.innerBorderColour).toBe("rgb(228, 220, 207)");

    // Square image box, inset 2px inside the cell.
    // The inner card's 1px border sits inside its box, so the stage is 2px
    // narrower than the inner itself.
    expect(geometry.imageWidth).toBeCloseTo(geometry.innerWidth - 2, 0);
    expect(Math.abs(geometry.imageHeight - geometry.imageWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.imageTop - 2)).toBeLessThanOrEqual(1);

    // Text is centred, 15/600.
    expect(geometry.nameCentreDelta).toBeLessThanOrEqual(2);
    expect(geometry.priceCentreDelta).toBeLessThanOrEqual(2);
    expect(geometry.nameSize).toBe("15px");
    expect(Number(geometry.nameWeight)).toBeGreaterThanOrEqual(600);

    // The action slot is reserved from the start.
    expect(geometry.actionHeight).toBeGreaterThanOrEqual(43);
  });

  test("hover reveals the quick-add row without moving anything", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");
    const cell = page.locator("[data-card][data-card-state='live']").first();
    // Positions are measured inside the cell: hovering scrolls the page, so a
    // viewport coordinate would move even when the card itself does not.
    const offsets = () =>
      cell.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const at = (node: Element | null) => {
          const r = (node as HTMLElement).getBoundingClientRect();
          return [Math.round((r.left - box.left) * 10) / 10, Math.round((r.top - box.top) * 10) / 10];
        };
        return {
          cell: Math.round(box.height * 10) / 10,
          name: at(el.querySelector("h3")),
          price: at(el.querySelector("[data-card-price]")),
        };
      });

    const before = await offsets();
    await cell.hover();
    await page.waitForTimeout(400);

    const button = cell.getByRole("button", { name: /أضف إلى السلة|إضافة/ }).first();
    await expect(button).toBeVisible();

    const after = await offsets();
    expect(after.cell).toBe(before.cell);
    expect(after.name).toEqual(before.name);
    expect(after.price).toEqual(before.price);
  });

  test("premium treatment is absent while the flag is off", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");

    // `features.premium` is off in data/settings.json: no badge, no gold
    // shell, no premium hover and no premium meta — every card is regular.
    await expect(page.locator("[data-premium-badge]")).toHaveCount(0);
    await expect(page.locator("[data-premium-frame]")).toHaveCount(0);
    await expect(page.locator("[data-card].pf-gold-surface")).toHaveCount(0);
    const badges = await page.locator("[data-card]").evaluateAll((nodes) =>
      nodes.map((node) => node.querySelector("[data-premium-badge]") !== null),
    );
    expect(badges.every((value) => value === false)).toBe(true);
  });
});
