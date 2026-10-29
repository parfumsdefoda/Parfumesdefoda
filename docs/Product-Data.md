# بيانات المنتجات — الملف الرئيسي / Product data — the master file

الملف الذي تعدّله هو **ملف واحد**: `data/product-master.csv`.
كل قرار تجاري أو وصفي للمنتج يبدأ من هنا. `data/products.json` هو ما يقرأه الموقع،
ولا يُحرَّر يدوياً بعد اليوم. الأمر الواحد الذي يشغّل الدورة كاملة هو
`npm run data:refresh` (وبعده `-- --apply` للكتابة).

**The file you edit is `data/product-master.csv`.** It is the only spreadsheet the
shop needs. `data/products.json` is what the site reads; you should not have to
touch it by hand. One command runs the whole cycle: `npm run data:refresh`,
then `npm run data:refresh -- --apply` to write.

> **لا يتم اختراع أي معلومة.** الخلية الفارغة معناها «غير معروف» ولا تمسح قيمة
> موجودة (باستثناء أعلام `is_*`، اقرأ §4). الخلية غير الصالحة تُرفض ويُطبع رقم
> سطرها وسببها. والخلية التي تحتوي `-` فقط **تمسح** القيمة (اقرأ §5).
>
> **Nothing is invented.** An empty cell means "unknown" and never clears a value
> (except the `is_*` flags, see §4). An invalid cell is rejected with its line
> number and reason. A cell containing exactly `-` **clears** the value (§5).

---

## 1. الدورة الكاملة / The round trip

```bash
npm run data:refresh                              # معاينة كاملة — لا يكتب شيئاً
npm run data:refresh -- --apply                   # يطبّق كل شيء ويشغّل كل الفحوصات
```

`data:refresh` بالترتيب:

1. **يتحقق من الملف**: أسماء الأعمدة المكررة، القيم غير المعروفة، تعارض الزيت،
   صورة كل منتج جديد، الصفوف المكررة.
2. **يدقّق الصور** ويعيد اشتقاق الصور المتغيّرة فقط (بصمة الملف، لا التاريخ).
3. **يستورد** الملف بـ `--sync-commerce --create-missing` (المعاينة تطبع الفرق فقط).
4. **يشتق صور المنتجات الجديدة** بعد إنشائها.
5. **يشغّل الفحوصات**: `validate-json`، `check:tokens`، `typecheck`، `lint`،
   `test`، `build`.

يتوقف عند **أول** فشل برسالة عربية وإنجليزية واضحة. لا يرفع شيئاً إلى Git ولا
يحذف أي ملف.

`data:refresh` runs those five steps in order and stops at the first failure with
a clear Arabic + English message. It never pushes, commits or deletes anything.
A dry run skips the image build and the gates — it only validates, audits the
photos and prints the diff.

A **new row whose photo is missing** is a refusal, not a failure: it is listed
under «لم تُنشأ / not created», the rest of the file is applied, and the buy
fields of every existing product still update. A rejected cell, a duplicate
slug or an unreadable master does stop the run.

### إذا أردت خطوة بخطوة / Step by step

```bash
npm run master:export                            # ينشئ/يحدّث ملف CSV من الكتالوج
# افتح data/product-master.csv في Excel / Numbers / Google Sheets واملأ الخلايا

npm run master:import                            # معاينة (dry run) — لا يكتب شيئاً
npm run master:import -- --apply                 # التصنيف + الإثراء فقط
npm run master:import -- --apply --sync-commerce # + الأسعار والمخزون والأسماء
npm run build:images                             # اشتقاق الصور المتغيّرة فقط
```

- الملف مكتوب بترميز **UTF-8 مع BOM** حتى تظهر العربية صحيحة في Excel.
- `master:export` لا يستبدل ملفاً فيه خلايا لم تُستورد بعد؛ سيرفض ويخبرك. استخدم
  `-- --force` فقط بعد أن تستورد ما في الملف (أو بعد نسخه احتياطياً).
- أي استيراد يعيد التحقق من الكتالوج بالكامل بمخطط Zod قبل الكتابة. لو فشل
  التحقق لا يُكتب شيء.

`master:export` refuses to overwrite a CSV holding cells that were never
imported — use `--force` only after importing (or after backing the file up).
A bare `master:import` is a dry run and writes nothing.

---

## 2. الأوضاع / Modes

| الوضع / mode | يكتب / writes | لا يكتب / never writes |
| --- | --- | --- |
| (بلا flags) معاينة / dry run | لا شيء | كل شيء |
| `--apply` | التصنيف + الإثراء (ويشمل الأعلام ومسح `-` وصورة placeholder) | الأسعار، المخزون، الأسماء، الأوصاف |
| `--apply --sync-commerce` | كل شيء | — |
| `--create-missing` | يسمح بإنشاء منتجات جديدة (راجع §7) | — |
| `--file=<path>` | يقرأ ملفاً آخر غير `data/product-master.csv` | — |

**لماذا الفصل؟** غلطة إملائية في خانة السعر لا يجب أن تغيّر أسعار المتجر أثناء
تعبئة الملاحظات العطرية.

A typo must not reprice the shop. Prices, availability, names and descriptions
move only with `--sync-commerce`.

---

## 3. الأعمدة / Columns

العمود لا يُعرَف بموضعه بل باسمه: يمكنك إعادة ترتيب الأعمدة بحرية.
أسماء الأعمدة **المكررة خطأ**: يتوقف الاستيراد ويطبع الاسم ورقمَي العمودين.

Columns are matched by NAME, never by position. A duplicate header name stops the
import and prints the name with both column numbers. An unknown column is ignored
with a warning — you may keep extra notes in the file.

| العمود / column | المعنى / meaning | الفارغ / empty means |
| --- | --- | --- |
| `slug` | معرّف المنتج (`pf020`) — **لا تغيّره** | الصف يُتخطّى |
| `sku` | كود المنتج (`PF020`) — يُستخدم لمسار الصورة. **للقراءة فقط** للمنتجات الموجودة | — |
| `name_ar` | اسم المنتج كما يظهر للعميل | لا تغيير |
| `on_site` | `نعم` = ظاهر، `لا` = مخفي (راجع §8) | لا تغيير |
| `gender` | الجنس | لا تغيير |
| `scent_style` | شرقي / غربي (يُخزَّن في `type`) | لا تغيير |
| `tier` | الدار: ديزاينر / نيش / دووب (تُخزَّن في `house`) | لا تغيير |
| `season` | الفصل | لا تغيير |
| `performance` | الأداء | لا تغيير |
| `is_fouda_original` | من إنتاج فودا نفسه | **`لا`** (اقرأ §4) |
| `is_oil` | زيت عطري (بدون كحول) | **`لا`** |
| `is_featured` | فاخر (البطاقة الذهبية + الترتيب في الهيرو) | **`لا`** |
| `concentration` | التركيز | غير معروف |
| `family` | العائلة العطرية | غير معروفة |
| `top_notes` | المقدمة | غير معروفة |
| `heart_notes` | القلب (يُخزَّن في `notes.middle`) | غير معروفة |
| `base_notes` | القاعدة | غير معروفة |
| `price_<ml>` | سعر عبوة ذلك الحجم (`price_100`, `price_12`, `price_3`, …) | لا تغيير |
| `avail_<ml>` | توفر نفس العبوة: `نعم` / `لا` | لا تغيير (ولحجم جديد: غير متوفر) |
| `description_ar` | وصف المنتج | لا تغيير |
| `gallery_extra` | صور إضافية بجانب الصورة الأساسية | لا توجد |
| `internal_note` | ملاحظة داخلية لك (لا تُعرض للعميل أبداً) | لا يوجد |

ملاحظات:

- `heart_notes` is the middle of the pyramid; the catalogue stores it as
  `notes.middle` (the field name predates this workflow and is unchanged).
- `sku` is the product id. Changing it would break the photo path and the
  product identity, so a different value is rejected, not applied.
- حجم العبوة (ml) يُقرأ من اسم العمود (`price_12` = ١٢ مل) ويُخزَّن كتسمية
  `12 مل`. لا توجد قائمة ثابتة للأحجام.

### الأحجام / Sizes — from the header, not from code

كل عمود اسمه `price_<رقم>` أو `avail_<رقم>` هو حجم بالملّي، **أياً كان ترتيب
الأعمدة**. الملف الحالي فيه سبعة أحجام: ٣، ٦، ١٠، ١٢، ٣٠، ٥٠، ١٠٠ مل.

- سعر لحجم **غير موجود** عند منتج: يُنشئ الحجم (`price_12` → `12 مل`).
- `avail_<ml>` وحدها لا تُنشئ حجماً أبداً — بدون سعر لا توجد عبوة.
- حجم جديد بلا `avail` يبدأ **غير متوفر**، ويُطبع تنبيه بذلك.
- حجم موجود و`avail` فارغة: تبقى حالته كما هي.
- ترتيب الأحجام في الموقع من الأكبر إلى الأصغر، وفلتر المقاس يعرض الأحجام
  المتوفرة فقط، من الأصغر إلى الأكبر.

Every `price_<ml>` / `avail_<ml>` header is a bottle volume, whatever the column
order. A price creates a missing size; availability alone never does. A new size
with a blank `avail` starts out of stock and is reported.

### القيم المتعددة / Multiple values

استخدم الشرطة العمودية `|`:

```
برغموت|هيل|فلفل وردي
```

لا تستخدم الفاصلة `,` ولا `،` — الخلية تُرفض مع سبب واضح.

### الأسعار والمخزون / Prices and availability

- `avail_*=لا` يجعل ذلك الحجم غير قابل للشراء. الخلية الفارغة تُبقي الحالة كما هي.
- توفّر المنتج ككل يُحسب تلقائياً: متوفر إذا كان فيه حجم واحد متوفر على الأقل.

---

## 4. الأعلام / Boolean flags — blank means لا

الأعمدة الثلاثة `is_fouda_original` و`is_oil` و`is_featured` هي **الاستثناء
الوحيد** لقاعدة «الفارغ لا يمسح»:

| الخلية / cell | النتيجة / result |
| --- | --- |
| `نعم` | يصبح العلم مفعّلاً |
| `لا` | يصبح العلم مطفأً |
| فارغة | **تصبح مطفأة** (مثل `لا`) |

لذلك: إذا أردت منتجاً فاخراً، اكتب `نعم` في `is_featured`. الخلية الفارغة تُطفئ
العلم. وقبل الكتابة يطبع الاستيراد **كل منتج سيفقد علمه** وكل منتج سيكسبه.

`is_oil=نعم` يعني زيتاً عطرياً. لا يمكن أن يكون الزيت بتركيز غير الزيت: إذا كانت
`concentration` مليئة بقيمة غير `oil` (مثل `edp`) مع `is_oil=نعم`، يُرفض الصف
بتعارض واضح. اترك `concentration` فارغة أو اكتب `oil`.

The three flag columns are the ONLY place where a blank cell acts as `لا`.
Every flip (on or off) is listed before anything is written. `is_oil=نعم` may not
contradict a non-oil concentration.

---

## 5. مسح قيمة / Clearing a value with `-`

خلية تحتوي **`-` فقط** (وليس `-` داخل نص) تمسح القيمة الموجودة. الأعمدة التي
تقبل المسح:

| العمود / column | معنى المسح / clearing it |
| --- | --- |
| `gallery_extra` | يرجع المعرض للصورة الأساسية فقط |
| `description_ar` | وصف فارغ |
| `top_notes` / `heart_notes` / `base_notes` | المستوى يصبح فارغاً |
| `concentration` | التركيز يُزال |
| `family` | العائلة تُزال |

`-` في أي عمود آخر ليس مسحاً، بل قيمة عادية (وسعر `-` يُرفض لأنه ليس رقماً).
الخلية **الفارغة** تبقى «لا تغيير».

A cell containing exactly `-` clears that field, for the columns above only. An
empty cell still means "do not touch". `-` is never exported, so a round trip is
stable.

---

## 6. القيم المسموحة / Allowed values

كل خانة تقبل **الاسم العربي أو الإنجليزي**؛ المخزَّن دائماً هو القيمة القياسية.

| العمود / column | القيم / values |
| --- | --- |
| `gender` | رجالي · نسائي (أو حريمي) · للجنسين — men · women · unisex |
| `scent_style` | شرقي · غربي — oriental · western |
| `tier` | ديزاينر · نيش · دووب — designer · niche · dupe |
| `season` | صيفي · شتوي · خريفي · ربيعي — summer · winter · autumn · spring |
| `performance` | أداء ضعيف · أداء متوسط · أداء قوي · أداء صاروخي — weak · moderate · strong · rocket |
| `avail_*` / `on_site` | نعم · لا — yes · no · true · false · 1 · 0 |

**اختلافات الإملاء العربية مقبولة**: `ى` مع `ي`، و`أ/إ/آ` مع `ا`، والمسافات
الزائدة. تُطبَّع قبل المطابقة ويُطبع تنبيه بكل تطبيع (تحذير، وليس خطأ).

Arabic spelling variants (`رجالى` → `رجالي`, hamza forms, extra spaces) are
folded before matching and reported as warnings, not rejections. A truly unknown
value is still an error with its line number.

### `concentration` — التركيز

| الكود / code | العربية | English |
| --- | --- | --- |
| `parfum` | بارفان | Parfum |
| `edp` | أو دو بارفان | Eau de Parfum |
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

أي قيمة خارج هذه الجداول تُرفض ويُطبع السطر والسبب.

---

## 7. إنشاء منتج جديد / Adding a new product

بدون `--create-missing` لا يُنشأ أي منتج؛ الصف يُطبع كـ «غير موجود في الكتالوج».
`data:refresh` يمرّر `--create-missing` دائماً.

`--create-missing` يسمح بالإنشاء فقط عندما:

1. `slug` غير موجود في الكتالوج.
2. الصورة `/products/{sku}.png` **موجودة فعلاً** على القرص.
3. كل الحقول المطلوبة موجودة وصحيحة: `name_ar`, `sku`, `gender`, `scent_style`,
   `tier`, `season`, `performance`، وسعر واحد على الأقل.

أي سبب آخر يُطبع كـ `cannot create: …` ولا يُنشأ شيء. لا تُخترع صورة ولا سعر ولا
تصنيف لإكمال منتج ناقص.

**خطوات إضافة منتج:**

1. صوّر العبوة وسمِّ الملف `PFxxx.png` (نفس حروف `sku`) وضعه في
   `public/products/`.
2. أضف صفاً في `data/product-master.csv` بكل الحقول وسعر واحد على الأقل.
3. `npm run data:refresh` (معاينة) — تأكد أن المنتج ظاهر تحت «سيُنشأ».
4. `npm run data:refresh -- --apply` — ينشئ المنتج ويشتق صوره ويشغّل الفحوصات.

Create only when the slug is absent, the photo exists and every required field is
valid. The new product starts out of stock for any size whose `avail` you left
blank, because "unknown" is not "available".

### منتج جديد بمقاسات زيت / A new oil product

```
...,is_oil=نعم,concentration=oil,...,price_12=850,price_6=500,price_3=350,avail_12=نعم,...
```

لا حاجة لأي تعديل في الكود: العمود نفسه كافٍ. البطاقة وصفحة المنتج ستعرضان
«زيت عطري»، وفلتر «الصيغة» يظهر تلقائياً عندما يكون في المتجر عطر وزيت معاً.

---

## 8. إخفاء منتج / Hiding a product (`on_site=لا`)

- المنتج يبقى في `data/products.json` بكل بياناته وصوره.
- يختفي من: قائمة المنتجات، البحث، التصفية، الهيرو، خريطة الموقع (sitemap)،
  واقتراحات المساعد الذكي.
- رابطه المباشر `/product/{slug}` يرجع **404**.
- `on_site=نعم` يعيده كما كان.

`on_site=لا` sets `hidden: true`. The product keeps its data and photos but is
excluded from every list, search, the sitemap and the AI suggestions, and its own
URL returns 404. The internal `دووب` tier never appears in any public surface.

---

## 9. الصور / Images

- **الاسم هو المفتاح**: `/products/PF020.png` → المنتج `pf020`، والمشتق يُحفظ في
  `public/products/derived/pf020/`.
- المنتج الذي ما زال يشير إلى `placeholder-unavailable.webp` وتوجد صورته الحقيقية
  على القرص: `--apply` يربطها تلقائياً ويطبعها تحت «صور تُربط». لا يُعاد تسمية
  ملف ولا يُحذف شيء.
- الأصول الأصلية لا تُعدَّل أبداً؛ المشتقة فقط.
- إذا كان خلفية الصورة ليست شفافة تماماً، تُضاف إلى `.audit/needs-retouch.txt`
  ولا تُقصّ تلقائياً. أعد قصّها يدوياً (PNG شفاف) ثم:

```bash
npm run build:images -- --slug=pf680 --force
```

- `npm run audit:images` يطبع تصنيف الخلفيات، الصور المفقودة، الملفات غير
  المستخدمة، والصور **المتطابقة بايت ببايت** تحت أسماء مختلفة.

The photo name IS the key. A product still on the shared placeholder is pointed at
its real photo by `--apply` when that file exists. A non-transparent background is
never auto-cut: it is listed for a manual retouch. Identical files under different
names are reported by the audit.

---

## 10. التقارير / Reports

`data/product-master-status.md` يُعاد توليده مع كل استيراد أو تصدير، ويعرض لكل
حقل كم منتجاً اكتمل فيه — أي الفجوة المتبقية.

كل معاينة تطبع أيضاً:

| التقرير / report | المعنى / meaning |
| --- | --- |
| علامات تتغير / flag changes | كل منتج سيكسب علم «فاخر» أو سيفقده |
| صور تُربط / placeholder → real photo | منتجات ستتصل بصورتها الحقيقية |
| في الكتالوج وليس في الملف / absent from the file | منتجات موجودة ولم يذكرها الملف — **لا تُحذف** |
| أسماء عامة مكررة / duplicate public names | منتجان بنفس الاسم (منتج + نسخته الفاخرة) — مسموح |
| أعمدة غير معروفة / unknown columns | أعمدة تُتجاهل |
| ملاحظات / warnings | تطبيع إملائي، حجم جديد غير متوفر، … |
