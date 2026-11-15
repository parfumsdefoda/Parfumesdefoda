# إعادة تصميم الواجهة — فرع `ui-gallery`

## ملخّص

هذا الفرع ينقل المتجر من لغة «الكبسولة» القديمة (زوايا دائرية، ظلال، هيدر معتم فوق
الهيرو) إلى لغة معرض مسطّحة: ورق `#F3EEE8`، حبر `#1B1620`، خطوط شعرية 1px، زوايا
صفر، بنفسجية للأزرار والاختيار، وذهبية للإطار الفاخر وخط واحد أعلى الفوتر. تغيّر
أيضاً بطاقة المنتج، الشبكة، صفحة المنتج، السلة/الدفع، صفحات المحتوى، والهيدر.

**R1-4:** حُذف الهيرو، وافتُتحت `/` بشريط تعريفي (h1 + «عرض الكل») ثم شبكة
الأكثر مبيعًا وثلاث خلايا أقسام وشريط المساعد. وفي `/shop` صار الشريط: مسار تنقّل
وعدد وزر واحد «الفلاتر والترتيب» يفتح دُرجًا واحدًا (أكورديون بعدّادات حيّة، ترتيب
كراديو، «مسح الكل»، زر بنفسجي «عرض N منتج»)، وحُذف حقل البحث من الشريط
والـpopovers. كل بنود `docs/UI-REVIEW.md` الآن «نعم».

## المقاييس

| البند | النتيجة |
|---|---|
| Lighthouse (موبايل، وسيط 3) | `/` 100، `/shop` 89، PDP 91/90، `/cart` 100، `/checkout` 100 |
| الوصولية | 100 في الستة، و0 مخالفة axe على 6 حالات تفاعلية |
| CLS / TBT | ≤ 0.003 / ≤ 48ms |
| أول تحميل JS (Brotli) | 208 / 214 / 215 / 219 / 219 / 213 / 257 KiB مقابل 240/260 |
| E2E | 179 ناجح، 0 فاشل، 13 متخطى — ثم 178/1 (نقرة رابط في الفوتر نجحت منفردة) ثم 179/0 |
| Lighthouse بعد إزالة الهيرو | `/` 90، LCP 3.6s (الصورة الأولى هي LCP الآن)، `/shop` 89 |

## المخاطر

- **تراجع أداء `/`:** إزالة الهيرو نقلت عنصر LCP إلى صورة المنتج الأولى، فهبطت
  الدرجة من 100 (LCP 0.91s) إلى 90 (LCP 3.6s) في قياس واحد. الحل المقترح تصغير
  مشتقات البطاقة أو تحميل الصورة الأولى مسبقًا.
- صفحة المنتج تعتمد على `--ink-muted` بعد تغميقه إلى 78% لتحقيق AA؛ أي تفتيح
  مستقبلي يعيد كسر التباين.
- الصور بدون alpha (11 منتجاً) تُعرض `cover`، أي تُقصّ عند أبعاد البطاقة بدل أن
  تُذاب في الورق. قائمة الانتظار في `.audit/needs-retouch.txt`.
- مسار «رفع الخلفية إلى الأبيض ثم multiply» مُثبت باختبارات وحدات فقط؛ لا توجد صورة
  في الكتالوج تجعله يعمل فعلياً.
- `/dev/product-card` يعمل فقط في `next dev` (404 في الإنتاج).

## قرارات المالك المطلوبة

1. **الهيرو:** حُذف في R1-4؛ هل يُعتمد ذلك نهائيًا أم يعود كبانر منفصل عن الشبكة؟
2. **صور بعبوة واحدة:** هل يستبدل المالك الصور الـ11 بصيغة PNG شفافة، أم يبقى
   القصّ الحالي؟
3. **ملخّص الطلب على الهاتف:** يبدأ مفتوحاً داخل `<details open>`؛ هل يُغلق ابتداءً
   على الهاتف؟

## قائمة المعاينة

- [ ] `/` — الشريط التعريفي، الشبكة، خلايا الأقسام، شريط المساعد، الفوتر.
- [ ] `/shop` — الشبكة، الفلاتر، الفلاتر على الهاتف.
- [ ] صفحة منتج عادي وصفحة منتج فاخر — إطار الذهب، المقاسات، الشريط اللاصق.
- [ ] السلة والدفع — الحقول، رسائل الخطأ، زر التأكيد على الهاتف.
- [ ] الأسئلة، الشحن، التواصل، 404.
- [ ] الوضع الداكن على النظام (يجب أن يبقى ورقياً).
- [ ] تكبير 200% والقائمة بلوحة المفاتيح.

---

# Gallery redesign — `ui-gallery`

## Summary

This branch moves the store from the old "capsule" language (rounded corners,
elevation, a dark header over a hero) to a flat gallery language: paper `#F3EEE8`,
ink `#1B1620`, 1px hairlines, zero radii, purple for actions and selection, and gold
reserved for the premium frame and one footer hairline. The product card, grid,
product page, cart/checkout, content pages and header were rebuilt on it.

**R1-4:** the hero is gone — `/` opens on a hairline intro bar (h1 + "عرض الكل"),
then eight best sellers, three category cells and the advisor strip. `/shop` now
has a breadcrumb, one count and one "الفلاتر والترتيب" trigger opening a single
left-edge drawer (accordions with live counts, sort radios, "مسح الكل", purple
"عرض N منتج"); the toolbar search and the per-group popovers are deleted. Every
row of `docs/UI-REVIEW.md` is now "Yes".

## Metrics

| Item | Result |
|---|---|
| Lighthouse (mobile, median of 3) | `/` 100, `/shop` 89, PDP 91/90, `/cart` 100, `/checkout` 100 |
| Accessibility | 100 on all six; zero axe violations across six interactive states |
| CLS / TBT | ≤ 0.003 / ≤ 48 ms |
| First-load JS (Brotli) | 208 / 214 / 215 / 219 / 219 / 213 / 257 KiB vs 240/260 |
| E2E | 179 passed, 0 failed, 13 skipped, then 178/1 (a footer link that passed alone), then 179/0 |
| Lighthouse after removing the hero | `/` 90, LCP 3.6 s (the first card photo is now the LCP), `/shop` 89 |

## Risks

- **`/` performance regressed:** removing the hero moved LCP onto the first product
  photo, so the single-run score fell from 100 (LCP 0.91 s) to 90 (LCP 3.6 s).
  Card derivative sizes or a preloaded first image are the fix.
- The product page depends on `--ink-muted` at 78% ink to hold AA; lightening it
  again breaks contrast on `/cart`.
- The 11 products without alpha are shown with `cover`, so the photo is cropped to
  the card rather than dissolving into paper. The queue is in
  `.audit/needs-retouch.txt`.
- The gain + multiply normalisation path is covered by unit tests only; no catalogue
  photo exercises it.
- `/dev/product-card` only works under `next dev` (404 in production).

## Owner decisions

1. **Hero:** remove it (R1-4) or keep it as a marketing exception?
2. **The 11 photos:** will the owner supply transparent PNGs, or keep the crop?
3. **Phone order summary:** it starts expanded inside `<details open>`; should it
   start collapsed on phones?

## Preview checklist

- [ ] `/` — section order, hero, footer.
- [ ] `/shop` — grid, filters, phone filters.
- [ ] Regular PDP and premium PDP — gold frame, sizes, sticky bar.
- [ ] Cart and checkout — inputs, error messages, phone submit.
- [ ] FAQ, shipping, contact, 404.
- [ ] System dark mode (must stay paper).
- [ ] 200% zoom and keyboard menu.
