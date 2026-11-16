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

  test("premium cells wear the gradient shell, glow and full-width CTA", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/shop");

    const premium = page.locator("[data-card]:has([data-premium-badge])").first();
    await expect(premium).toBeVisible();

    // The old inset frame and its diamond line are gone for good.
    await expect(page.locator("[data-premium-frame]")).toHaveCount(0);
    await expect(premium.getByText("◆", { exact: false })).toHaveCount(0);

    const badge = premium.locator("[data-premium-badge]");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("فاخر");
    await expect(badge.locator("svg")).toHaveCount(1);

    const shell = await premium.evaluate((el) => {
      const inner = el.firstElementChild as HTMLElement;
      const style = getComputedStyle(el);
      const innerStyle = getComputedStyle(inner);
      return {
        radius: style.borderTopLeftRadius,
        padding: style.paddingTop,
        gradient: style.backgroundImage,
        shadow: style.boxShadow,
        innerRadius: innerStyle.borderTopLeftRadius,
        innerWidth: inner.getBoundingClientRect().width,
      };
    });

    expect(shell.radius).toBe("16px");
    expect(shell.padding).toBe("2px");
    expect(shell.gradient).toContain("linear-gradient");
    expect(shell.shadow).not.toBe("none");
    expect(shell.innerRadius).toBe("14px");

    // The CTA is visible from the start, ink/gold, and inset only by the text
    // block's 14px padding — i.e. effectively full width.
    const cta = premium.getByRole("button", { name: /أضف إلى السلة/ });
    await expect(cta).toBeVisible();
    const button = await cta.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        background: style.backgroundColor,
        colour: style.color,
      };
    });
    // 14px padding on each side plus the inner card's 1px border.
    expect(button.width).toBeCloseTo(shell.innerWidth - 30, 0);
    expect(button.height).toBeGreaterThanOrEqual(43);
    expect(button.background).toBe("rgb(22, 18, 14)");
    expect(button.colour).toBe("rgb(232, 199, 102)");

    // The shell stays still under reduced motion, but the glow still deepens.
    await premium.hover();
    await page.waitForTimeout(250);
    const hovered = await premium.evaluate((el) => ({
      shadow: getComputedStyle(el).boxShadow,
      transform: getComputedStyle(el).transform,
    }));
    expect(hovered.shadow).not.toBe(shell.shadow);
    expect(hovered.transform).toBe("none");

    // A premium cell never grows its row: it matches the regular cells beside it.
    const rows = await page.locator("[data-card]").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return {
          top: Math.round(box.top),
          height: Math.round(box.height),
          premium: Boolean(node.querySelector("[data-premium-badge]")),
        };
      }),
    );
    const target = rows.find((row) => row.premium);
    expect(target).toBeDefined();
    const sameRow = rows.filter((row) => Math.abs(row.top - target!.top) <= 2);
    expect(sameRow.some((row) => !row.premium)).toBe(true);
    for (const row of sameRow) {
      expect(Math.abs(row.height - target!.height), "row height").toBeLessThanOrEqual(1);
    }
  });
});
