# دليل صاحب المتجر

> عدّل **الملف الواحد** `data/product-master.csv`، ثم شغّل الأمر الواحد
> `npm run data:refresh`، وبعده `npm run data:refresh -- --apply` عندما تكون
> راضياً عن المعاينة. لا تحتاج لتعديل `data/products.json` أو أي كود.

## قبل أي تعديل

افتح مجلد المشروع في الطرفية وشغّل:

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

إذا فشل أمر، أصلح أول رسالة خطأ ثم أعد تشغيله. لا ترفع التعديلات قبل نجاح
الفحوصات. بعد أي تعديل على البيانات يكفي `npm run data:refresh -- --apply` لأنه
يشغّل `validate-json` و`check:tokens` والفحص النوعي والـ lint والاختبارات والبناء.

## تعديل منتج

1. افتح `data/product-master.csv` وابحث عن `slug` المنتج (مثل `pf680`).
   **لا تغيّر `slug` أو `sku`**: الصور والروابط والسلة تعتمد عليهما.
2. عدّل الاسم أو الوصف أو السعر أو التوفر في خلاياه.
3. `npm run data:refresh` (معاينة: يطبع كل تغيير مجمّعاً ولا يكتب شيئاً).
4. `npm run data:refresh -- --apply` للكتابة.

الأسعار تكون في `price_<الحجم>` (مثل `price_50`)، والتوفر في `avail_<الحجم>`
(`نعم` / `لا`). الخلية **الفارغة** تعني «اتركها كما هي».

## إضافة منتج جديد

1. صوّر العبوة وسمِّ الملف نفس حروف `sku` + `.png`، مثل `PF690.png`، وضعه في
   `public/products/`. لا صورة = لا إنشاء (هذا مقصود).
2. أضف صفاً في `data/product-master.csv`: `slug`, `sku`, `name_ar`, `on_site`,
   `gender`, `scent_style`, `tier`, `season`, `performance`، وسعر واحد على الأقل.
3. `npm run data:refresh` — ستجد المنتج تحت «سيُنشأ». راجع أي سبب رفض.
4. `npm run data:refresh -- --apply` — ينشئ المنتج ويشتق صوره ويشغّل الفحوصات.

**زيت عطري جديد:** اكتب `نعم` في `is_oil` و`oil` في `concentration`، وضع أسعاره
في `price_12` و`price_6` و`price_3` (أو أي حجم تبيعه). الموقع يعرض «زيت عطري»
ويضيف «الصيغة» للفلاتر تلقائياً.

**نسخة فاخرة:** أنشئ صفاً جديداً باسم يحتوي «(فاخر)» — مثل `تيروني (فاخر)`. لا
تكرر كلمة فاخر: البطاقة الذهبية تظهر مرة واحدة فقط.

## إخفاء منتج أو إظهاره

غيّر `on_site` إلى `لا` لإخفائه أو `نعم` لإظهاره، ثم `npm run data:refresh -- --apply`.
المنتج المخفي لا يظهر في القوائم ولا البحث ولا خريطة الموقع، ورابطه يرجع 404.
لا تحذف بياناته أو صوره لمجرد إخفائه.

## مسح قيمة موجودة

خلية تحتوي **`-` فقط** تمسح القيمة. تعمل في: `gallery_extra` (يرجع للصورة
الأساسية)، `description_ar`، `top_notes`، `heart_notes`، `base_notes`،
`concentration`، `family`. مثال: صورة النسخة الفاخرة ظهرت في معرض المنتج
الأساسي؟ اكتب `-` في `gallery_extra`.

## الأعلام: فاخر / زيت / إنتاج فودا

`is_featured` و`is_oil` و`is_fouda_original`: `نعم` = مفعّل، `لا` أو **فراغ** =
مطفأ. الخلية الفارغة تُطفئ العلم — لذلك اكتب `نعم` لكل منتج تريد بقاءه فاخراً.
المعاينة تطبع كل منتج سيكسب العلم أو سيفقده قبل الكتابة.

## تثبيت زجاجات الواجهة الرئيسية

في `data/settings.json` عدّل `heroProducts` كقائمة slugs مثل
`["pf080", "pf150", "pf240"]`. اختر فقط منتجات ظاهرة، متوفرة، وصورتها شفافة.
عند تركها فارغة يختار الموقع المنتجات «فاخر» أولاً ثم يكمل الثلاثة بالأكثر
مبيعاً، ولا يعرض زجاجة واحدة إلا إذا لم يوجد ثلاثة منتجات صالحة.

## تغيير الشحن

افتح `data/settings.json` وغيّر `shipping.cost`. الشحن الحالي مبلغ ثابت 100 جنيه
لكل طلب، ولا يوجد حد للشحن المجاني. إذا قررت مبلغاً جديداً، راجع مع المطور
السياسات التي تذكر السعر، ثم شغّل الفحوصات.

## الصور

- لكل الصور المتغيّرة: `npm run build:images` (يتخطى ما لم يتغيّر).
- صورة واحدة: `npm run build:images -- --slug=pf680`
- فرض إعادة التوليد: أضف `--force`
- تحقق من الاكتمال: `npm run check:derived`
- خلفية غير شفافة؟ تُسجَّل في `.audit/needs-retouch.txt` ولا تُقصّ تلقائياً؛
  اقصّها يدوياً ثم `npm run build:images -- --slug=pfxxx --force`.

الصورة الأصلية لا تُعدَّل. ملفات AVIF/WebP المشتقة داخل `public/products/derived/`.

## أوامر الفحوصات

| الأمر | معناه |
|---|---|
| `npm run data:refresh` | معاينة تحديث البيانات: تحقق + تدقيق صور + فرق الاستيراد |
| `npm run data:refresh -- --apply` | تطبيق التحديث ثم كل الفحوصات والبناء |
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

- **`image public/products/PFxxx.png does not exist`**: المنتج الجديد يحتاج صورته
  قبل الإنشاء. أضف الملف ثم أعد المحاولة.
- **`duplicate column`**: اسم عمود مكرر في الرأس. احذف المكرر (يخبرك بالعمودين).
- **`unknown ...`**: قيمة غير معروفة في ذلك العمود. راجع جدول القيم في
  `docs/Product-Data.md`.
- **`conflict: concentration is ...`**: `is_oil=نعم` مع تركيز غير `oil`. اكتب
  `oil` أو امسح التركيز.
- **`rejected cells`**: لا يُكتب شيء. أصلح الخلايا المذكورة (بأرقام سطورها) وأعد.
- **فشل `validate-json`**: فاصلة/قوس غير صحيح أو قيمة لا تطابق المخطط.
- **فشل `check:derived`**: صورة مشتقة أو سجل manifest مفقود؛ أعد `npm run build:images`.
- **فشل `build`**: لا تنشر النسخة؛ احتفظ بنص الخطأ واطلب مساعدة المطور.
- **تعذر إرسال الطلب / 503**: لا تمسح السلة. افحص متغيرات قناة البريد أو واتساب
  لدى مسؤول الاستضافة، ثم نفّذ طلباً تجريبياً.
- **429**: أوقف المحاولات وانتظر المدة المعروضة.
- **فشل preflight في الإنتاج**: لا تطلق حتى تضبط قناة طلب واحدة على الأقل
  والـ domain وDNS ومتغيرات الاستضافة.

---

# Owner guide (English)

Edit ONE file — `data/product-master.csv` — then run `npm run data:refresh` to
preview and `npm run data:refresh -- --apply` to write, derive images and run every
gate. Never edit `data/products.json` by hand and never change an existing slug or
sku. Prices live in `price_<ml>` columns and availability in `avail_<ml>`; a blank
cell keeps the current value, while a cell containing exactly `-` clears it (for
gallery, description, notes, concentration and family). The three `is_*` flags are
the exception: `نعم` means on, while `لا` **and a blank cell** mean off, and every
flip is printed before anything is written. A new product needs its photo at
`public/products/PFxxx.png`; a new oil needs `is_oil=نعم`, `concentration=oil` and
its `price_12` / `price_6` / `price_3` cells. A premium variant is a separate row
whose name contains "(فاخر)". Hide a product with `on_site=لا`. Pin hero bottles
with the optional `heroProducts` setting; otherwise the hero shows featured
products first and fills the trio with the best sellers. Flat shipping is
`shipping.cost` in `data/settings.json` (100 EGP, no free-shipping threshold).
Photos with a non-transparent background are listed in `.audit/needs-retouch.txt`
and never auto-cut. Before launch run `npm run preflight -- --url=https://your-domain`.
