# بيانات المنتجات — الحقول الاختيارية / Product data — optional facts

`data/products.json` هو مصدر البيانات الوحيد للمنتجات. هذا الدليل يشرح كيف تضيف
حقائق العطر الاختيارية (التركيز، العائلة العطرية، الهرم العطري، حجم كل عبوة،
صور إضافية) عن طريق ملف CSV — بدون لمس أي كود.

`data/products.json` is the single source of truth. This guide covers the
optional fragrance facts, filled through a CSV so no TypeScript is ever edited.

> **لا يتم اختراع أي معلومة.** الخلية الفارغة تبقى غير موجودة في `products.json`.
> الخلية غير الصالحة تُرفض وتُطبع بسببها، ولا تُخمَّن ولا تُصحَّح تلقائياً.
>
> **Nothing is invented.** An empty cell stays absent. An invalid cell is
> rejected with a reason — never guessed at or silently corrected.

---

## 1. الدورة / The round trip

```bash
npm run enrich:export                  # ينشئ data/product-enrichment.csv + ملف الحالة
# افتح الملف في Excel / Numbers / Google Sheets واملأ الخلايا الفارغة
npm run enrich:import -- --dry-run     # معاينة: يعرض التغييرات والخلايا المرفوضة
npm run enrich:import                  # يطبّق التغييرات على data/products.json
```

- `npm run enrich:export` يكتب الملف بترميز UTF-8 مع BOM حتى تظهر العربية صحيحة
  في Excel، ويكتب أيضاً `data/product-enrichment-status.md`.
- `npm run enrich:import --dry-run` لا يكتب أي ملف. راجعه دائماً قبل التطبيق.
- `npm run enrich:import` يتحقق من الكتالوج بالكامل بعد الدمج، ولا يكتب شيئاً إن
  فشل التحقق.

بعد الاستيراد شغّل:

```bash
npm run validate-json && npm run typecheck && npm run test
```

- `data/product-enrichment.csv` — UTF-8 with BOM so Excel shows Arabic correctly.
- `--dry-run` writes nothing; always preview first.
- The merged catalogue is re-validated against the schema before anything is written.

---

## 2. الأعمدة / Columns

| العمود / column | المعنى / meaning | الفارغ / empty means |
| --- | --- | --- |
| `slug` | معرّف المنتج (`pf020`) — **لا تغيّره** | الصف يُرفض |
| `name` | اسم المنتج — **للقراءة فقط**، يُتجاهل عند الاستيراد | — |
| `concentration` | تركيز العطر (قيمة من الجدول أدناه) | غير معروف |
| `family` | العائلة العطرية (قيمة من الجدول أدناه) | غير معروفة |
| `top_notes` | المقدمة / top notes | غير معروفة |
| `heart_notes` | القلب / heart notes | غير معروفة |
| `base_notes` | القاعدة / base notes | غير معروفة |
| `size_ml_per_size` | حجم كل عبوة بالمليلتر | غير معروف |
| `gallery_extra` | صور إضافية بجانب الصورة الأساسية | لا توجد صور إضافية |

- `heart_notes` is the middle of the pyramid; the catalogue stores it as
  `notes.middle` (the field name predates this workflow and is unchanged).
- `name` is there so you can see which row is which. Editing it changes nothing.

### القيم المتعددة / Multiple values

استخدم الشرطة العمودية `|` بين القيم:

```
هيل|فلفل وردي|برغموت
```

لا تستخدم الفاصلة `,` ولا الفاصلة العربية `،` — الخلية تُرفض مع سبب واضح.

Use `|` between values. Commas are rejected with an explicit reason.

### حجم العبوة / Per-size volume

اكتب `التسمية=الرقم`، والتفاصيل مفصولة بـ `|`:

```
10 مل=10|30 مل=30|50 مل=50|100 مل=100
```

- التسمية يجب أن تكون واحدة من تسميات ذلك المنتج بالضبط
  (`10 مل`, `30 مل`, `50 مل`, `100 مل`).
- الرقم يجب أن يكون موجباً.
- التسمية الخاطئة تُرفض: `unknown size "250 مل" — this product has: 10 مل, 30 مل, …`

The label must match one of that product's size labels exactly, and the volume
must be a positive number.

### الصور الإضافية / Extra gallery views

- مسار واحد أو أكثر يفصله `|`، وكل مسار يبدأ بـ `/`، مثال:
  `/products/PF020-2.png|/products/PF020-3.png`
- الصورة الأساسية (`image`) تبقى الأولى في المعرض ولا تُحذف أبداً.
- الصور تُضاف فقط — لا يحذف الاستيراد صورة موجودة.

Paths must start with `/`. Views are only ever appended; the cover stays first.

---

## 3. القيم المسموحة / Allowed enum values

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

الكود أو الاسم العربي مقبولان في الخلية؛ المخزَّن دائماً هو الكود.
Both the code and the Arabic name are accepted; the code is what gets stored.

---

## 4. الكتابة فوق قيمة موجودة / Overwriting an existing value

أي قيمة موجودة مسبقاً لا تُستبدل، وتُرفض الخلية مع سبب `already set — use --force`.
للاستبدال المتعمّد:

```bash
npm run enrich:import -- --force --dry-run   # معاينة
npm run enrich:import -- --force
```

A filled value is never replaced without `--force`.

---

## 5. التقارير / Reports

`data/product-enrichment-status.md` يُعاد توليده مع كل تصدير أو استيراد، ويعرض
لكل حقل كم منتجاً اكتمل فيه — أي الفجوة المتبقية.

`data/product-enrichment-status.md` is regenerated on every export/import and
shows, per field, how many products are filled in.

---

## 6. أين تظهر هذه البيانات؟ / Where these fields appear

في هذه المرحلة **لا تُعرض** هذه الحقول في الواجهة. النموذج جاهز فقط، والمراحل
القادمة (البطاقات وصفحة المنتج) هي التي ستستخدمها.

Nothing renders these fields yet. The model is ready; later phases consume it.

- `concentration` / `family` — Arabic labels come from one lookup module
  (`src/lib/product-labels.ts`), never from a component.
- `formatConcentrationSize("edp", 50)` → `EDP · 50 مل`، ويُرجع `null` إذا كان
  أحد الطرفين غير معروف — نصف معلومة لا تُعرض كنصف بطاقة.
