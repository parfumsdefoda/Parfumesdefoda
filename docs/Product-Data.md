# بيانات المنتجات — الملف الرئيسي / Product data — the master file

الملف الذي تعدّله هو **ملف واحد**: `data/product-master.csv`.
كل قرار تجاري أو وصفي للمنتج يبدأ من هنا. `data/products.json` هو ما يقرأه الموقع،
ولا يُحرَّر يدوياً بعد اليوم.

**The file you edit is `data/product-master.csv`.** It is the only spreadsheet
the shop needs. `data/products.json` is what the site reads; you should not have
to touch it by hand again.

> **لا يتم اختراع أي معلومة.** الخلية الفارغة معناها «غير معروف» ولا تمسح قيمة
> موجودة. الخلية غير الصالحة تُرفض ويُطبع رقم سطرها وسببها.
>
> **Nothing is invented.** An empty cell means "unknown" and never clears a
> value. An invalid cell is rejected with its line number and the reason.

---

## 1. الدورة الكاملة / The round trip

```bash
npm run master:export                            # ينشئ/يحدّث ملف CSV من الكتالوج
# افتح data/product-master.csv في Excel / Numbers / Google Sheets واملأ الخلايا

npm run master:import                            # معاينة (dry run) — لا يكتب شيئاً
npm run master:import -- --apply                 # التصنيف + الإثراء فقط
npm run master:import -- --apply --sync-commerce # + الأسعار والمخزون والأسماء
```

- الملف مكتوب بترميز **UTF-8 مع BOM** حتى تظهر العربية صحيحة في Excel.
- `master:export` لا يستبدل ملفاً فيه خلايا لم تُستورد بعد؛ سيرفض ويخبرك. استخدم
  `-- --force` فقط بعد أن تستورد ما في الملف (أو بعد نسخه احتياطياً).
- `master:import` بلا أي flag هو **معاينة**: يطبع كل تغيير مجمّعاً حسب الحقل
  (تصنيف / إثراء / أسعار) ولا يكتب أي ملف.
- أي استيراد يعيد التحقق من الكتالوج بالكامل بمخطط Zod قبل الكتابة. لو فشل
  التحقق لا يُكتب شيء.

`master:export` refuses to overwrite a CSV holding cells that were never
imported — use `--force` only after importing (or after backing the file up).
A bare `master:import` is a dry run and writes nothing.

بعد كل استيراد:

```bash
npm run validate-json && npm run typecheck && npm run lint && npm run test
```

---

## 2. الأوضاع / Modes

| الوضع / mode | يكتب / writes | لا يكتب / never writes |
| --- | --- | --- |
| (بلا flags) معاينة / dry run | لا شيء | كل شيء |
| `--apply` | التصنيف + الإثراء | الأسعار، المخزون، الأسماء، الأوصاف |
| `--apply --sync-commerce` | كل شيء | — |
| `--create-missing` | (يسمح بإنشاء منتجات جديدة، راجع §5) | — |
| `--file=<path>` | يقرأ ملفاً آخر غير `data/product-master.csv` | — |

**لماذا الفصل؟** غلطة إملائية في خانة السعر لا يجب أن تغيّر أسعار المتجر أثناء
تعبئة الملاحظات العطرية. الأسعار والمخزون والأسماء والأوصاف لا تتحرك إلا عندما
تطلب ذلك صراحةً.

A typo must not reprice the shop. Prices, availability, names and descriptions
move only with `--sync-commerce`.

---

## 3. الأعمدة / Columns

| العمود / column | المعنى / meaning | الفارغ / empty means |
| --- | --- | --- |
| `slug` | معرّف المنتج (`pf020`) — **لا تغيّره** | الصف يُتخطّى |
| `sku` | كود المنتج (`PF020`) — يُستخدم لمسار الصورة. **للقراءة فقط** للمنتجات الموجودة | — |
| `name_ar` | اسم المنتج كما يظهر للعميل | لا تغيير |
| `on_site` | `نعم` = ظاهر، `لا` = مخفي (راجع §6) | لا تغيير |
| `gender` | الجنس | لا تغيير |
| `scent_style` | شرقي / غربي (يُخزَّن في `type`) | لا تغيير |
| `tier` | الدار: ديزاينر / نيش / دووب (تُخزَّن في `house`) | لا تغيير |
| `season` | الفصل | لا تغيير |
| `performance` | الأداء | لا تغيير |
| `is_fouda_original` | من إنتاج فودا نفسه | لا تغيير |
| `is_oil` | زيت عطري (بدون كحول) | لا تغيير |
| `is_featured` | فاخر (البطاقة الذهبية + الترتيب في الهيرو) | لا تغيير |
| `concentration` | التركيز | غير معروف |
| `family` | العائلة العطرية | غير معروفة |
| `top_notes` | المقدمة | غير معروفة |
| `heart_notes` | القلب (يُخزَّن في `notes.middle`) | غير معروفة |
| `base_notes` | القاعدة | غير معروفة |
| `price_100` … `price_10` | سعر عبوة ١٠٠ / ٥٠ / ٣٠ / ١٠ مل | لا تغيير |
| `avail_100` … `avail_10` | توفر نفس العبوة: `نعم` / `لا` | لا تغيير |
| `description_ar` | وصف المنتج | لا تغيير |
| `gallery_extra` | صور إضافية بجانب الصورة الأساسية | لا توجد |
| `internal_note` | ملاحظة داخلية لك (لا تُعرض للعميل أبداً) | لا يوجد |

ملاحظات:

- `heart_notes` is the middle of the pyramid; the catalogue stores it as
  `notes.middle` (the field name predates this workflow and is unchanged).
- `sku` is the product id. Changing it would break the photo path and the
  product identity, so a different value is rejected, not applied.
- حجم العبوة (ml) يُقرأ من تسمية الحجم نفسها (`100 مل` = 100) ولا يُخترع.

### القيم المتعددة / Multiple values

استخدم الشرطة العمودية `|`:

```
برغموت|هيل|فلفل وردي
```

لا تستخدم الفاصلة `,` ولا `،` — الخلية تُرفض مع سبب واضح.

### الأسعار والمخزون / Prices and availability

- كل سعر مربوط بحجم موجود بالفعل. سعر لحجم لا يملكه المنتج **يُرفض** ولا ينشئ حجماً
  جديداً.
- `avail_*=لا` يجعل ذلك الحجم غير قابل للشراء. الخلية الفارغة تُبقي الحالة كما هي.
- توفّر المنتج ككل يُحسب تلقائياً: متوفر إذا كان فيه حجم واحد متوفر على الأقل.

A price for a size the product does not have is rejected — a size is never
created from a price. Blank `avail_*` keeps the current state.

---

## 4. القيم المسموحة / Allowed values

كل خانة تقبل **الاسم العربي أو الإنجليزي**؛ المخزَّن دائماً هو القيمة القياسية.

| العمود / column | القيم / values |
| --- | --- |
| `gender` | رجالي · نسائي (أو حريمي) · للجنسين — men · women · unisex |
| `scent_style` | شرقي · غربي — oriental · western |
| `tier` | ديزاينر · نيش · دووب — designer · niche · dupe |
| `season` | صيفي · شتوي · خريفي · ربيعي — summer · winter · autumn · spring |
| `performance` | أداء ضعيف · أداء متوسط · أداء قوي · أداء صاروخي — weak · moderate · strong · rocket |
| `is_*` / `avail_*` / `on_site` | نعم · لا — yes · no · true · false · 1 · 0 |

### `concentration` — التركيز

| الكود / code | العربية | English |
| --- | --- | --- |
| `parfum` | بارفوم | Parfum |
| `edp` | أو دو بارفوم | Eau de Parfum |
| `edt` | أو دو تواليت | Eau de Toilette |
| `edc` | أو دو كولونيا | Eau de Cologne |
| `oil` | زيت عطري | Perfume oil |

### `family` — العائلة العطرية

| الكود / code | العربية | English |
| --- | --- | --- |
| `aromatic` | أروماتي | Aromatic |
| `citrus` | حمضي | Citrus |
| `floral` | زهري | Floral |
| `fougere` | فوجير | Fougère |
| `fresh` | منعش | Fresh |
| `gourmand` | جورماند | Gourmand |
| `leather` | جلدي | Leather |
| `musk` | مسكي | Musk |
| `oriental` | شرقي | Oriental / Amber |
| `woody` | خشبي | Woody |

أي قيمة خارج هذه الجداول تُرفض ويُطبع السطر والسبب. Arabic labels live in one
place in code (`src/lib/product-labels.ts`), never in a component.

---

## 5. إنشاء منتج جديد / Adding a new product

بدون `--create-missing` لا يُنشأ أي منتج؛ الصف يُطبع كـ «غير موجود في الكتالوج».

`--create-missing` يسمح بالإنشاء فقط عندما:

1. `slug` غير موجود في الكتالوج.
2. الصورة `/products/{sku}.png` **موجودة فعلاً** على القرص.
3. كل الحقول المطلوبة موجودة وصحيحة: `name_ar`, `sku`, `gender`, `scent_style`,
   `tier`, `season`, `performance`، وسعر واحد على الأقل.

أي سبب آخر يُطبع كـ `cannot create: …` ولا يُنشأ شيء. لا تُخترع صورة ولا سعر ولا
تصنيف لإكمال منتج ناقص.

Create only when the slug is absent, the photo exists and every required field
is valid. Every failure is reported with its reason; nothing is defaulted.

المنتج الجديد يبدأ بحالة مخزون `لا` لأي حجم لم تكتب له `avail_*`، لأن «غير معروف»
لا تعني «متوفر».

---

## 6. إخفاء منتج / Hiding a product (`on_site=لا`)

- المنتج يبقى في `data/products.json` بكل بياناته وصوره.
- يختفي من: قائمة المنتجات، البحث، التصفية، الهيرو، خريطة الموقع (sitemap)،
  واقتراحات المساعد الذكي.
- رابطه المباشر `/product/{slug}` يرجع **404**.
- `on_site=نعم` يعيده كما كان.

`on_site=لا` sets `hidden: true`. The product keeps its data and photos but is
excluded from every list, search, the sitemap and the AI suggestions, and its
own URL returns 404.

> ملاحظة: المنتجات الخمسة التي لا تملك صورة حقيقية (pf590, pf600, pf610, pf620,
> pf640) تظهر بحالة «قريبًا» ولا يمكن شراؤها. لتخفيها تماماً اكتب `on_site=لا`.

---

## 7. التقارير / Reports

`data/product-master-status.md` يُعاد توليده مع كل استيراد أو تصدير، ويعرض لكل
حقل كم منتجاً اكتمل فيه — أي الفجوة المتبقية.

`data/product-master-status.md` is regenerated on every import/export and shows,
per field, how many products are filled in.

---

## 8. أين تظهر هذه البيانات؟ / Where these fields appear

- التصنيف والأسعار والأسماء والأوصاف والمخزون: البطاقات وصفحة المنتج والسلة
  وإتمام الطلب (كما هي اليوم).
- `on_site`: يتحكم في الظهور كما في §6.
- `concentration` / `family` / `notes`: مخزَّنة وجاهزة، لكن **لا تُعرض بعد**.
  المراحل القادمة هي التي ستستخدمها، والتسميات العربية تأتي من
  `src/lib/product-labels.ts` فقط (`formatConcentrationSize("edp", 50)` →
  `EDP · 50 مل`، ويرجع `null` لو كان أحد الطرفين غير معروف).
