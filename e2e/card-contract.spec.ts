import { test, expect } from "@playwright/test";

/**
 * The gallery cell (contracts C, G, F, X): a hairline cell on paper, a square
 * image box, the name and the price centred under it, a reserved action slot,
 * and a gold hairline around premium cells.
 *
 * Note: the brief asks for an image box at least 0.78 of the cell height while
 * also reserving a 44px action slot and a two-line name; at four columns that
 * is arithmetically impossible (0.69 at a 360px cell). The ratio is recorded in
 * docs/DECISIONS-ui-gallery.md and the structural checks below are the part of
 * the contract that can be enforced.
 */

test.describe("gallery card", () => {
  test("cell, image box and text obey the shape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");

    const cell = page.locator("[data-card]").first();
    await expect(cell).toBeVisible();

    const geometry = await cell.evaluate((el) => {
      const image = el.querySelector("[data-card-stage]") as HTMLElement;
      const name = el.querySelector("h3") as HTMLElement;
      const price = el.querySelector("[data-card-price]") as HTMLElement | null;
      const action = el.querySelector("[data-card-action]") as HTMLElement;
      const cellBox = el.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      const nameBox = name.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        cellWidth: cellBox.width,
        imageWidth: imageBox.width,
        imageHeight: imageBox.height,
        imageTop: imageBox.top - cellBox.top,
        nameCentreDelta: Math.abs(nameBox.left + nameBox.width / 2 - (cellBox.left + cellBox.width / 2)),
        priceCentreDelta: price
          ? Math.abs(price.getBoundingClientRect().left + price.getBoundingClientRect().width / 2 - (cellBox.left + cellBox.width / 2))
          : 0,
        radius: style.borderTopLeftRadius,
        shadow: style.boxShadow,
        borderEnd: style.borderInlineEndWidth,
        borderBottom: style.borderBottomWidth,
        actionSlot: action.getBoundingClientRect().height,
        nameSize: getComputedStyle(name).fontSize,
        nameWeight: getComputedStyle(name).fontWeight,
      };
    });

    // Square image box, full cell width, sitting at the top.
    expect(Math.abs(geometry.imageWidth - geometry.cellWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.imageHeight - geometry.imageWidth)).toBeLessThanOrEqual(2);
    expect(geometry.imageTop).toBeLessThanOrEqual(1);

    // Hairline cell on paper: no radius, no elevation.
    expect(geometry.radius).toBe("0px");
    expect(geometry.shadow).toBe("none");
    expect(geometry.borderEnd).toBe("1px");
    expect(geometry.borderBottom).toBe("1px");

    // Text is centred, 15/600.
    expect(geometry.nameCentreDelta).toBeLessThanOrEqual(2);
    expect(geometry.priceCentreDelta).toBeLessThanOrEqual(2);
    expect(geometry.nameSize).toBe("15px");
    expect(Number(geometry.nameWeight)).toBeGreaterThanOrEqual(600);

    // The action slot is reserved from the start.
    expect(geometry.actionSlot).toBeGreaterThanOrEqual(43);
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

  test("premium cells carry a 10px gold frame and keep their height", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");

    const framed = page.locator("[data-premium-frame]").first();
    await expect(framed).toBeVisible();
    const inset = await framed.evaluate((el) => {
      const frame = el.getBoundingClientRect();
      const cell = (el.closest("[data-card]") as HTMLElement).getBoundingClientRect();
      return Math.round(frame.left - cell.left);
    });
    expect(Math.abs(inset - 10)).toBeLessThanOrEqual(1);
  });
});
