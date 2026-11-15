# إعادة تصميم الواجهة — فرع `ui-gallery`

## ملخّص

هذا الفرع ينقل المتجر من لغة «الكبسولة» القديمة (زوايا دائرية، ظلال، هيدر معتم فوق
الهيرو) إلى لغة معرض مسطّحة: ورق `#F3EEE8`، حبر `#1B1620`، خطوط شعرية 1px، زوايا
صفر، بنفسجية للأزرار والاختيار، وذهبية للإطار الفاخر وخط واحد أعلى الفوتر. تغيّر
أيضاً بطاقة المنتج، الشبكة، صفحة المنتج، السلة/الدفع، صفحات المحتوى، والهيدر.

**ما لم يُنفَّذ:** R1-4 — الهيرو القديم ما زال في `/`، وشريط `/shop` ما زال يعرض
أقراص الفلاتر المستديرة وحقل البحث. لذلك `docs/UI-REVIEW.md` يحتوي بندين «لا»،
ولذلك **لم يُدفع الفرع**.

## المقاييس

| البند | النتيجة |
|---|---|
| Lighthouse (موبايل، وسيط 3) | `/` 100، `/shop` 89، PDP 91/90، `/cart` 100، `/checkout` 100 |
| الوصولية | 100 في الستة، و0 مخالفة axe على 6 حالات تفاعلية |
| CLS / TBT | ≤ 0.003 / ≤ 48ms |
| أول تحميل JS (Brotli) | 208 / 214 / 215 / 219 / 219 / 213 / 257 KiB مقابل 240/260 |
| E2E | 182 ناجح، 0 فاشل، 13 متخطى — ثلاث مرات متتالية |

## المخاطر

- صفحة المنتج تعتمد على `--ink-muted` بعد تغميقه إلى 78% لتحقيق AA؛ أي تفتيح
  مستقبلي يعيد كسر التباين.
- الصور بدون alpha (11 منتجاً) تُعرض `cover`، أي تُقصّ عند أبعاد البطاقة بدل أن
  تُذاب في الورق. قائمة الانتظار في `.audit/needs-retouch.txt`.
- مسار «رفع الخلفية إلى الأبيض ثم multiply» مُثبت باختبارات وحدات فقط؛ لا توجد صورة
  في الكتالوج تجعله يعمل فعلياً.
- `/dev/product-card` يعمل فقط في `next dev` (404 في الإنتاج).

## قرارات المالك المطلوبة

1. **الهيرو:** يُحذف (R1-4) أم يبقى كاستثناء تسويقي؟
2. **صور بعبوة واحدة:** هل يستبدل المالك الصور الـ11 بصيغة PNG شفافة، أم يبقى
   القصّ الحالي؟
3. **ملخّص الطلب على الهاتف:** يبدأ مفتوحاً داخل `<details open>`؛ هل يُغلق ابتداءً
   على الهاتف؟

## قائمة المعاينة

- [ ] `/` — ترتيب الأقسام، الهيرو، الفوتر.
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

**Not delivered:** R1-4 — `/` still renders the old hero, and `/shop` still shows
the rounded filter pills and toolbar search. Two rows of `docs/UI-REVIEW.md` are
therefore "No", which is why the branch was not pushed.

## Metrics

| Item | Result |
|---|---|
| Lighthouse (mobile, median of 3) | `/` 100, `/shop` 89, PDP 91/90, `/cart` 100, `/checkout` 100 |
| Accessibility | 100 on all six; zero axe violations across six interactive states |
| CLS / TBT | ≤ 0.003 / ≤ 48 ms |
| First-load JS (Brotli) | 208 / 214 / 215 / 219 / 219 / 213 / 257 KiB vs 240/260 |
| E2E | 182 passed, 0 failed, 13 skipped — three consecutive runs |

## Risks

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
