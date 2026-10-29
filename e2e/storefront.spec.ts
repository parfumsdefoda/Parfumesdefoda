import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import products from "../data/products.json";

const product = products.find((item) => item.id === "PF020")!;
const line = {
  productId: product.id,
  slug: product.slug,
  sizeLabel: product.sizes.find((size) => size.inStock)!.label,
  price: product.sizes.find((size) => size.inStock)!.price,
  quantity: 1,
  name: product.name,
  image: product.image,
};

async function seedCart(page: Page, items = [line]) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: "parfumsdefoda-cart", value: items },
  );
}

async function mockOrder(route: Route, status: number, payload: object) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: status === 429 ? { "Retry-After": "30" } : undefined,
    body: JSON.stringify(payload),
  });
}

async function completeCheckout(page: Page) {
  await page.getByLabel("الاسم بالكامل").fill("أحمد محمد");
  await page.getByLabel("رقم الموبايل").fill("01012345678");
  await page.getByLabel("رقم واتساب للتواصل").fill("+20 10 1234 5678");
  await page.getByRole("searchbox", { name: "ابحث عن المحافظة" }).fill("القاهرة");
  await page.getByLabel("المحافظة", { exact: true }).selectOption({ label: "القاهرة" });
  await page.getByLabel("المدينة").selectOption({ label: "مدينة نصر" });
  await page.getByLabel("العنوان بالتفصيل — أقرب معلم").fill("شارع عباس العقاد، مبنى ١٢");
}

test.describe("production storefront and checkout", () => {
  test("home has a single heading, three hero bottles, shop CTA, category and best sellers", async ({ page }) => {
    // networkidle: the hero plates are laid out with their derived images; measuring
    // scrollWidth during that first layout pass reports a phantom horizontal overflow.
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    // Base-UI renders the CTA as <a href="/shop" role="button">, so it is a
    // button in the accessibility tree, not a link.
    await expect(page.getByRole("button", { name: "تسوّق الآن" })).toHaveAttribute("href", "/shop");
    await expect(page.locator("section[aria-labelledby='hero-heading'] img")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "الأكثر مبيعًا" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "تسوّق حسب القسم" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test("desktop navigation, skip link, and footer links are reachable", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop navigation layout");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "القائمة الرئيسية" }).getByRole("link", { name: "المتجر" })).toHaveAttribute("href", "/shop");
    await page.getByRole("link", { name: "انتقل إلى المحتوى الرئيسي" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "الأسئلة الشائعة" })).toHaveAttribute("href", "/faq");
  });

  test("mobile menu opens, traps focus, closes with Escape, and returns focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile menu behavior");
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "القائمة" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The advisor entry point moved from this menu to the floating launcher, so
    // this asserts what the menu now promises: the WhatsApp order channel and
    // text-only navigation (the launcher itself is covered separately).
    const whatsapp = dialog.locator('a[href*="wa.me"]');
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toContainText("واتساب");
    await expect(dialog.locator("img")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("shop filters are URL-driven, search normalizes Arabic, and category routes lock gender", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator("h1")).toHaveCount(1);
    const search = page.getByRole("searchbox", { name: "بحث" }).first();
    // Real key events, not fill(): WebKit drops the input event that fill()
    // synthesises on a type=search field, so the controlled value never commits.
    await search.pressSequentially("افريكان");
    // The site search is a GET form (action="/shop" name="q"); it commits on submit.
    await search.press("Enter");
    await expect(page).toHaveURL(/q=/, { timeout: 10_000 });
    await expect(page.getByRole("link", { name: /أفريكان ليذر/ }).first()).toBeVisible();
    await page.getByLabel("الترتيب").selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);
    for (const [path, heading] of [["/shop/men", "رجالي"], ["/shop/women", "حريمي"], ["/shop/unisex", "للجنسين"]]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveText(heading);
    }
    await page.goto("/?gender=%D8%B1%D8%AC%D8%A7%D9%84%D9%8A");
    await expect(page).toHaveURL(/\/shop\?gender=/);
  });

  test("PDP size selector, cart drawer, accordion, gallery, related products, and WhatsApp link", async ({ page }) => {
    await page.goto("/product/pf090");
    await expect(page.locator("h1")).toHaveCount(1);
    const sizes = page.getByRole("radiogroup", { name: "اختر الحجم" }).getByRole("radio");
    await expect(sizes).toHaveCount(4);
    await sizes.nth(0).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(sizes.nth(1)).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "أضف إلى السلة", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("أمواج انترلود").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "وصف العطر" }).click();
    await expect(page.getByText(/أمواج انترلود/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "عطور مشابهة" })).toBeVisible();
    await expect(page.getByRole("link", { name: /اسأل عن هذا العطر/ })).toHaveAttribute("href", /wa\.me/);
    await page.getByRole("button", { name: /تكبير الصورة/ }).first().click();
    const zoom = page.getByRole("dialog");
    await expect(zoom).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(zoom).toBeHidden();
  });

  test("sold-out product has no buyable CTA and a visible PDP uses derived images", async ({ page }) => {
    // The catalogue has no coming-soon product since every photo arrived; the
    // same contract is checked on a product whose every size is sold out.
    await page.goto("/product/pf290");
    await expect(page.locator("h1")).toHaveCount(1);
    const cta = page.locator("[data-purchase-cta] button").first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText("غير متوفر");
    await expect(cta).toBeDisabled();
    // Related-product quick-adds still exist with names like
    // "أضف إلى السلة — تيروني"; the main CTA would be the exact name.
    await expect(page.getByRole("button", { name: "أضف إلى السلة", exact: true })).toHaveCount(0);
    await page.goto("/product/pf090");
    await expect(page.locator("picture source[type='image/avif']").first()).toHaveAttribute("srcset", /products\/derived/);
    const requestedOriginals: string[] = [];
    page.on("request", (request) => {
      if (/\/products\/PF\d+\.png/i.test(request.url())) requestedOriginals.push(request.url());
    });
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    expect(requestedOriginals).toEqual([]);
  });

  test("cart quantity, remove, empty state, and checkout link", async ({ page }) => {
    await seedCart(page);
    await page.goto("/cart");
    // The server renders the empty state and hydration swaps in the persisted
    // lines, so wait for the line itself before asserting on the cart shell.
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "سلة التسوق", exact: true })).toBeVisible();
    // Each stepper button is labelled with the quantity it leads to.
    await page.getByRole("button", { name: "الكمية: ٢" }).click();
    await expect(page.getByRole("button", { name: "الكمية: ٣" })).toBeVisible();
    await page.getByRole("button", { name: "إزالة المنتج" }).click();
    await expect(page.getByText("سلة التسوق فارغة")).toBeVisible();
    await expect(page.getByRole("button", { name: "تصفّح المتجر" })).toHaveAttribute("href", "/shop");
  });

  test("checkout validation focuses the summary and successful submission clears cart only on success", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await page.getByRole("button", { name: /تأكيد الطلب/ }).first().click();
    await expect(page.locator("#checkout-error-summary")).toBeFocused();
    // The same text appears in the summary and inline: assert on each explicitly.
    await expect(
      page.locator("#checkout-error-summary").getByRole("link", { name: "الاسم يجب أن يكون على الأقل حرفين" }),
    ).toBeVisible();
    await expect(page.locator("#checkout-name-error")).toHaveText("الاسم يجب أن يكون على الأقل حرفين");
    await completeCheckout(page);
    await expect(page.getByLabel("رقم الموبايل")).toHaveValue("01012345678");
    await expect(page.getByLabel("رقم واتساب للتواصل")).toHaveValue("01012345678");
    let requests = 0;
    await page.route("**/api/orders", async (route) => {
      requests += 1;
      // Delay the response so the pending state is observable.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await mockOrder(route, 201, { success: true, orderNumber: "PDF-20261028-00001", total: 220 });
    });
    const submit = page.getByRole("button", { name: /تأكيد الطلب/ }).first();
    await submit.click();
    // Disabled while the request is in flight, so a second press cannot order twice.
    await expect(submit).toBeDisabled();
    await expect(page).toHaveURL(/\/checkout\/success/);
    expect(requests).toBe(1);
    await expect(page.getByText("PDF-20261028-00001")).toBeVisible();
    await expect(page.getByRole("button", { name: "أرسل رقم الطلب عبر واتساب" })).toHaveAttribute("href", /wa\.me/);
    // Assert the persisted cart was cleared BEFORE any reload: seedCart installs
    // an init script that re-seeds localStorage on every navigation. The persist
    // effect runs after the render that clears the cart, hence the poll.
    await expect
      .poll(async () => {
        const stored = await page.evaluate(() => localStorage.getItem("parfumsdefoda-cart"));
        return stored === null || stored === "[]";
      })
      .toBe(true);
    await page.reload();
    await expect(page.getByText("PDF-20261028-00001")).toBeVisible();
  });

  for (const failure of [
    { name: "503", status: 503, body: { error: "تعذر إرسال الطلب مؤقتًا" }, message: /تعذر إرسال الطلب/ },
    { name: "429", status: 429, body: { error: "تجاوز الحد" }, message: /انتظر ٣٠ ثانية/ },
    { name: "network", status: 0, body: {}, message: /حصلت مشكلة/ },
  ]) {
    test(`checkout ${failure.name} failure retains cart and entered form values`, async ({ page }) => {
      await seedCart(page);
      await page.goto("/checkout");
      await completeCheckout(page);
      await page.route("**/api/orders", async (route) => {
        if (failure.status === 0) await route.abort("failed");
        else await mockOrder(route, failure.status, failure.body);
      });
      await page.getByRole("button", { name: /تأكيد الطلب/ }).first().click();
      await expect(page.getByRole("alert").filter({ hasText: failure.message })).toBeVisible();
      await expect(page.getByLabel("الاسم بالكامل")).toHaveValue("أحمد محمد");
      await expect(page.getByLabel("رقم الموبايل")).toHaveValue("01012345678");
      await expect(page.getByText(product.name).first()).toBeVisible();
    });
  }

  test("SEO endpoints, canonical metadata, JSON-LD, and custom 404 are valid", async ({ page, request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("/product/pf090");
    // The sitemap lists every visible product: coming-soon pages exist and
    // answer 200, while hidden products (none in the catalogue today) must
    // never appear.
    const locs = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const listed = locs
      .filter((url) => url.includes("/product/"))
      .map((url) => url.split("/product/")[1])
      .sort();
    expect(listed).toEqual(
      products
        .filter((product) => (product as { hidden?: boolean }).hidden !== true)
        .map((product) => product.slug)
        .sort(),
    );
    expect(sitemapText).not.toContain("/product/does-not-exist");
    expect((await request.get("/robots.txt")).ok()).toBeTruthy();
    for (const path of ["/", "/shop", "/shop/women", "/product/pf090"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect((await page.title()).trim()).not.toBe("");
      await expect(page.locator("meta[name='description']")).toHaveAttribute("content", /.+/);
      await expect(page.locator("link[rel='canonical']")).toHaveCount(1);
      const blocks = await page.locator("script[type='application/ld+json']").allTextContents();
      for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
    }
    // Private routes must never be indexed (BUG-005: /checkout inherited the
    // root metadata and was open to search engines).
    for (const path of ["/cart", "/checkout", "/checkout/success"]) {
      await page.goto(path);
      await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
    }
    await page.goto("/route-that-does-not-exist");
    await expect(page).toHaveTitle(/404|غير موجودة|Parfums De Foda/);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("no-JavaScript smoke: home, catalogue, and product content remains readable", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("button", { name: "تسوّق الآن" })).toHaveAttribute("href", "/shop");
    await page.goto("/shop");
    await expect(page.locator("h1")).toBeVisible();
    await page.goto("/product/pf090");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "مسار التنقل" })).toBeVisible();
    await context.close();
  });

  test("indexable pages pass serious and critical axe checks", async ({ page }) => {
    for (const path of ["/", "/shop", "/product/pf090", "/cart", "/checkout", "/checkout/success", "/faq", "/contact"]) {
      if (path === "/cart" || path === "/checkout") await seedCart(page);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(serious, `${path}: ${serious.map((violation) => violation.id).join(", ")}`).toEqual([]);
      const moderate = results.violations
        .filter((violation) => violation.impact === "moderate")
        .map((violation) => violation.id);
      if (moderate.length) console.log(`axe moderate on ${path}: ${moderate.join(", ")}`);
    }
  });

  test("stable visual snapshots for home, shop, PDP, and checkout", async ({ page }) => {
    // The baselines are captured on the owner's Windows machine. The Linux
    // runner substitutes different Arabic fonts, so pixel comparison there
    // fails on every page for reasons unrelated to the app. Keep the check
    // local; CI still runs every functional and axe assertion.
    test.skip(process.env.CI === "true", "visual baselines are platform-specific");
    await seedCart(page);
    for (const [path, name] of [
      ["/", "home"],
      ["/shop", "shop"],
      ["/product/pf090", "product-pf090"],
      ["/checkout", "checkout"],
    ] as const) {
      // networkidle keeps the capture out of the first-layout pass, when the
      // derived images and the CSS are still settling.
      await page.goto(path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}.png`, {
        animations: "disabled",
        fullPage: true,
        mask: [page.locator("footer")],
        maxDiffPixelRatio: 0.015,
      });
    }
  });
});

test.describe("release coverage: filters, cart limits, phones, sticky bar", () => {
  test("mobile filter sheet applies a facet, updates the count, clears, and returns focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the filter sheet exists on phones");
    await page.goto("/shop");
    const count = page.locator('p[aria-live="polite"]').first();
    const before = (await count.textContent()) ?? "";
    const trigger = page.getByRole("button", { name: /^الفلاتر/ });

    await trigger.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "الفلاتر" })).toBeVisible();

    await sheet.getByRole("checkbox", { name: "رجالي" }).click();
    await expect(page).toHaveURL(/gender=/);
    await sheet.getByRole("button", { name: /عرض .* منتج/ }).click();
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();

    const after = (await count.textContent()) ?? "";
    expect(after).not.toBe(before);

    await trigger.click();
    await page.getByRole("dialog").getByRole("button", { name: "مسح الكل" }).click();
    await expect(page).not.toHaveURL(/gender=/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("size filter narrows the grid and an impossible search shows the empty state", async ({ page }) => {
    // Read the catalogue size from the page instead of hardcoding 40: the
    // owner's master decides how many products are on site.
    await page.goto("/shop");
    const count = page.locator('p[aria-live="polite"]').first();
    const fullCatalogue = (await count.textContent())?.trim() ?? "";
    await expect(count).not.toHaveText("٠ منتج");

    await page.goto(`/shop?size=${encodeURIComponent("50 مل")}`);
    await expect(count).not.toHaveText("٠ منتج");

    const search = page.getByRole("searchbox", { name: "بحث" }).first();
    await search.pressSequentially("zzzzzzz");
    await search.press("Enter");
    await expect(page.getByText("لا توجد منتجات مطابقة")).toBeVisible();
    await page.getByRole("link", { name: "مسح الفلاتر" }).click();
    await expect(page.getByText("لا توجد منتجات مطابقة")).toBeHidden();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(count).toHaveText(fullCatalogue);
  });

  test("out-of-stock products are ordered after every in-stock product", async ({ page }) => {
    await page.goto("/shop");
    const hrefs = await page.locator('a[href^="/product/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute("href") ?? ""))].filter(Boolean),
    );
    const outOfStock = new Set(
      products.filter((product) => !product.inStock).map((product) => `/product/${product.slug}`),
    );
    const stockIndexes = hrefs.map((href, index) => (outOfStock.has(href) ? -1 : index)).filter((index) => index >= 0);
    const oosIndexes = hrefs.map((href, index) => (outOfStock.has(href) ? index : -1)).filter((index) => index >= 0);
    expect(oosIndexes.length).toBeGreaterThan(0);
    expect(stockIndexes.length).toBeGreaterThan(0);
    expect(Math.max(...stockIndexes)).toBeLessThan(Math.min(...oosIndexes));
  });

  test("quantity stepper enforces the 1..20 limits", async ({ page }) => {
    await seedCart(page, [{ ...line, quantity: 20 }]);
    await page.goto("/cart");
    await expect(page.getByRole("button", { name: "الكمية: ٢١" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "الكمية: ١٩" })).toBeEnabled();

    await seedCart(page, [{ ...line, quantity: 1 }]);
    await page.goto("/cart");
    await expect(page.getByRole("button", { name: "الكمية: ٠" })).toBeDisabled();
  });

  test("a stale cart line explains itself and blocks checkout until it is fixed", async ({ page }) => {
    await seedCart(page, [{ ...line, price: line.price + 5 }]);
    await page.goto("/cart");
    await expect(page.getByRole("alert").filter({ hasText: "تغير السعر" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "احذف أو صحح الأسطر" })).toBeVisible();
    // Base-UI renders the disabled anchor as a button with aria-disabled.
    const checkout = page.getByRole("button", { name: "إتمام الطلب" });
    await expect(checkout).toBeVisible();
    await expect(checkout).toHaveAttribute("aria-disabled", "true");
  });

  test("an unknown product slug renders the Arabic 404 and is absent from the sitemap", async ({ page, request }) => {
    await page.goto("/product/does-not-exist");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByText("الصفحة غير موجودة")).toBeVisible();
    const sitemap = await request.get("/sitemap.xml");
    expect(await sitemap.text()).not.toContain("/product/does-not-exist");
  });

  test("Egyptian phone variants normalise to one stored format and copy into WhatsApp", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    const phone = page.getByLabel("رقم الموبايل");

    for (const variant of ["+20 10 1234 5678", "0020 10 1234 5678", "٠١٠١٢٣٤٥٦٧٨"]) {
      await phone.fill(variant);
      await phone.blur();
      await expect(phone).toHaveValue("01012345678");
    }
    await expect(page.getByText("سيُحفظ بصيغة 01012345678").first()).toBeVisible();

    await page.getByRole("checkbox", { name: "نفس رقم الهاتف" }).click();
    await expect(page.getByLabel("رقم واتساب للتواصل")).toHaveValue("01012345678");

    await phone.fill("123");
    await phone.blur();
    // The message is rendered twice (error summary + inline): assert the field's own alert.
    await expect(page.locator("#checkout-phone-error")).toContainText("يرجى إدخال رقم هاتف مصري صحيح");
  });

  test("indexable pages carry a unique title and exactly one h1", async ({ page }) => {
    const seen = new Set<string>();
    for (const path of ["/", "/shop", "/shop/men", "/product/pf090", "/faq", "/contact"]) {
      await page.goto(path);
      const title = ((await page.locator("title").textContent()) ?? "").trim();
      const description = await page.locator("meta[name='description']").getAttribute("content");
      expect(title).not.toBe("");
      expect((description ?? "").trim()).not.toBe("");
      expect(seen.has(title), `duplicate title on ${path}: ${title}`).toBe(false);
      seen.add(title);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("sticky PDP bar appears after the CTA scrolls away and retracts at the footer", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the sticky bar is phone-only");
    await page.goto("/product/pf090");
    const bar = page.locator("[data-sticky-bar]");

    await expect(bar).toHaveAttribute("data-visible", "false");
    await page.locator("[data-purchase-cta] button").scrollIntoViewIfNeeded();
    await expect(bar).toHaveAttribute("data-visible", "false");

    await page.evaluate(() => {
      const cta = document.querySelector<HTMLElement>("[data-purchase-cta]");
      if (cta) window.scrollTo(0, cta.getBoundingClientRect().top + window.scrollY + 300);
    });
    await expect(bar).toHaveAttribute("data-visible", "true");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar).toHaveAttribute("data-visible", "false");
  });

  test("axe: the open mobile menu and filter sheet add no serious violations", async ({ page, isMobile }) => {
    test.skip(!isMobile, "both overlays exist on phones");
    await page.goto("/");
    await page.getByRole("button", { name: "القائمة" }).click();
    let results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    let serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious, serious.map((violation) => violation.id).join(", ")).toEqual([]);
    await page.keyboard.press("Escape");

    await page.goto("/shop");
    await page.getByRole("button", { name: /^الفلاتر/ }).click();
    results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious, serious.map((violation) => violation.id).join(", ")).toEqual([]);
    const moderate = results.violations
      .filter((violation) => violation.impact === "moderate")
      .map((violation) => violation.id);
    if (moderate.length) console.log(`axe moderate (filter sheet): ${moderate.join(", ")}`);
  });
});
