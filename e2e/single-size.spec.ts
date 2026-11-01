import { expect, test } from "@playwright/test";
import products from "../data/products.json";

/**
 * The first real single-size products (100 مل only) went live in refresh-3.
 *
 * Nothing here names a slug: the product is found by its PROPERTY (exactly one
 * size, in stock, visible), so the spec keeps working when the owner adds or
 * renames single-size products.
 */
const single = products.find(
  (item) => !item.hidden && item.sizes.length === 1 && item.inStock,
);
/** The size label as the UI prints it: "١٠٠ مل", not "100 مل". */
const arabicLabel = (label: string) =>
  label.replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
const multi = products.find(
  (item) => !item.hidden && item.sizes.filter((size) => size.inStock).length > 1,
);

test.describe("single-size products", () => {
  test.skip(!single, "the catalogue carries no single-size product yet");

  test("the card prices it without من and quick add goes straight to the drawer", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "hover quick add is a pointer-device control");

    await page.goto(`/shop?q=${encodeURIComponent(single!.name)}`, { waitUntil: "networkidle" });
    const card = page.locator(`article:has(a[href="/product/${single!.slug}"])`).first();
    await expect(card).toBeVisible();

    // One size: no "من" prefix, the price is the price.
    await expect(card).not.toContainText("من ");

    await card.hover();
    await card.getByRole("button", { name: /أضف/ }).first().click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(single!.name).first()).toBeVisible();
    await expect(drawer).toContainText(arabicLabel(single!.sizes[0].label));
  });

  test("the PDP shows the one size as a sensible option, not a stretched row", async ({
    page,
  }) => {
    await page.goto(`/product/${single!.slug}`, { waitUntil: "networkidle" });

    const group = page.getByRole("radiogroup", { name: "اختر الحجم" });
    const radios = group.getByRole("radio");
    await expect(radios).toHaveCount(1);
    await expect(radios.first()).toHaveAttribute("aria-checked", "true");

    const option = await radios.first().boundingBox();
    const row = await group.boundingBox();
    expect(option && row && option.width < row.width * 0.9).toBe(true);

    // Adding from the PDP still lands in the cart with the same single size.
    await page.getByRole("button", { name: "أضف إلى السلة", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(arabicLabel(single!.sizes[0].label));
  });

  test("a multi-size product still asks which size and keeps من", async ({ page, isMobile }) => {
    test.skip(!multi || isMobile, "pointer devices and a multi-size product");
    await page.goto(`/shop?q=${encodeURIComponent(multi!.name)}`, { waitUntil: "networkidle" });
    const card = page.locator(`article:has(a[href="/product/${multi!.slug}"])`).first();
    await expect(card).toContainText("من");
  });
});
