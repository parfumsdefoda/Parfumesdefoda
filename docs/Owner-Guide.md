# دليل صاحب المتجر

## قبل أي تعديل

افتح مجلد المشروع في الطرفية، ثم شغّل:

```bash
npm ci
npm run validate-json
npm run check:tokens
npm run check:derived
npm run typecheck
npm run lint
npm test
npm run build
```

إذا فشل أمر، أصلح أول رسالة خطأ ثم أعد تشغيله. لا ترفع التعديلات قبل نجاح الفحوصات.

## تعديل منتج

افتح `data/products.json` وابحث عن المنتج باستخدام `id` مثل `PF020` أو `slug` مثل `pf020`. غيّر الاسم أو الوصف أو السعر أو حالة التوفر في الحقول الموجودة فقط. لا تغيّر `id` أو `slug` لأن الصور والروابط والسلة تعتمد عليها. السعر والتوفر لكل حجم موجودان داخل `sizes`.

بعد التعديل شغّل `npm run validate-json` ثم بقية الفحوصات أعلاه.

## إضافة منتج وصورته

1. أضف صف المنتج إلى `data/product-master.csv` حسب الأعمدة الحالية، مع `id` و`slug` وبيانات كل حجم.
2. ضع صورة الغلاف في `public/products/PFxxx.png`، وأضف صور المعرض بأسماء PF أخرى موجودة في الصف. استخدم صورة المنتج الحقيقية فقط.
3. شغّل `npm run master:import` واقرأ خطة التغييرات/الرفض قبل اعتمادها. لا تتجاوز رفضاً دون معرفة السبب.
4. شغّل `npm run build:images -- --slug=pfxxx` لإنشاء الصور المشتقة؛ الاسم بعد `--slug=` هو slug بحروف صغيرة.
5. شغّل `npm run check:derived` و`npm run validate-json` وبقية الفحوصات.

لا تنشئ مقاساً جديداً من نفسك؛ المقاسات المعتمدة هي 10 و30 و50 و100 مل كما يحددها مخطط البيانات.

## إخفاء منتج أو إظهاره

غيّر `on_site` في صف المنتج داخل `data/product-master.csv` إلى `لا` لإخفائه أو `نعم` لإظهاره، ثم شغّل `npm run master:import`. المنتج المخفي لا يظهر للزوار ولا في خريطة الموقع. لا تحذف بياناته أو صوره لمجرد إخفائه.

## تغيير الشحن

افتح `data/settings.json` وغيّر `shipping.cost`. الشحن الحالي مبلغ ثابت 100 جنيه لكل طلب، ولا يوجد حد للشحن المجاني. إذا قررت مبلغاً جديداً، حدّث الاختبارات والسياسات/الرسائل التي تذكر السعر بمراجعة مطور، ثم شغّل الفحوصات.

## تثبيت زجاجات الواجهة الرئيسية

في `data/settings.json` أضف/عدّل `heroProducts` كقائمة slugs مثل `"heroProducts": ["pf080", "pf150", "pf240"]`. اختر فقط منتجات ظاهرة، متوفرة، ولها صورة مشتقة شفافة. عند عدم ضبطها يختار الموقع المنتجات المميزة من بيانات المبيعات.

## تجديد الصور

- لكل الصور: `npm run build:images`
- صورة واحدة: `npm run build:images -- --slug=pfxxx`
- فرض إعادة التوليد: أضف `--force`
- تحقق من الاكتمال: `npm run check:derived`

الصورة الأصلية لا تُستبدل. ملفات AVIF/WebP المشتقة داخل `public/products/derived/`.

## أوامر الفحوصات

| الأمر | معناه |
|---|---|
| `npm run validate-json` | سلامة JSON ومخطط المنتجات والإعدادات |
| `npm run check:tokens` | منع الألوان/الظلال/الأحجام خارج نظام التصميم |
| `npm run check:derived` | اكتمال الصور المشتقة والـ manifest |
| `npm run typecheck` | فحص TypeScript |
| `npm run lint` | فحص قواعد الكود |
| `npm test` | اختبارات الوحدات وواجهات API |
| `npm run build` | بناء نسخة الإنتاج |
| `npm run e2e` | اختبارات المتصفح على نسخة الإنتاج بعد البناء |
| `npm run perf:check` | قياس الأداء وميزانياته؛ يحتاج الموقع شغالاً على localhost:3000 أو `PERF_BASE_URL` |
| `npm run preflight -- --url=https://your-domain` | فحوصات الإطلاق للموقع المنشور |

## أخطاء شائعة وماذا تفعل

- **فشل validate-json:** يوجد فاصلة/قوس غير صحيح أو قيمة لا تطابق مخطط المنتج؛ أصلح الحقل الذي يسميه الخطأ.
- **فشل check:derived:** صورة مشتقة أو سجل manifest مفقود؛ تأكد من وجود الصورة الأصلية ثم أعد `npm run build:images -- --slug=...`.
- **فشل build:** لا تنشر النسخة؛ احتفظ بنص الخطأ واطلب مساعدة المطور.
- **تعذر إرسال الطلب / 503:** لا تمسح السلة. افحص متغيرات قناة البريد أو واتساب لدى مسؤول الاستضافة، ثم نفّذ طلباً تجريبياً.
- **429:** أوقف المحاولات المتكررة وانتظر المدة المعروضة.
- **فشل preflight في الإنتاج:** لا تطلق حتى تضبط قناة طلب واحدة على الأقل والـ domain وDNS ومتغيرات الاستضافة.

---

# Owner guide (English)

Run `npm ci`, then the full check sequence in the opening section before shipping any edits. Edit products in `data/products.json`; add source photos as `public/products/PFxxx.png`, import master-sheet rows with `npm run master:import`, and generate AVIF/WebP assets using `npm run build:images -- --slug=pfxxx`. Never change an existing product ID/slug or invent product claims. Hide/show products by setting `on_site` in the existing master CSV and importing it. Flat shipping is configured in `data/settings.json`; the current fee is 100 EGP, with no free-shipping threshold. Pin hero bottle slugs with the optional `heroProducts` setting. Use `npm run check:derived` to verify generated image files. Before launch run `npm run preflight -- --url=https://your-domain`; a 503 requires channel configuration and never means the customer should clear their cart.
