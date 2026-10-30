# خطة الإطلاق — Release plan

هذا الملف يشرح كيف تُدمج سلسلة الفروع في `main`، وكيف تُنشر أول مرة، وكيف يُتراجع عن
الإصدار، وما يجب مراقبته في الأسبوع الأول. لا يحتوي أي قيمة سرية: أسماء المتغيرات فقط.

## ١. سلسلة الفروع

```
main
 └── phase-0-fixes … phase-7-release   (البناء، البيانات، الواجهة، الطلب، الاختبارات)
      └── refresh-2                    (تحديث الكتالوج، الهيدر، المساعد العائم)
           └── qa-sweep                (جولة ضمان الجودة: ٨ إصلاحات + تقرير)
                └── perf-1             (ميزانية الجافاسكربت، LCP، حماية الصور المشتقة)
```

كل فرع يبني على الذي قبله، ولا يوجد فرع متفرع من `main` في وقت لاحق. لذلك الدمج يكون
مرة واحدة من آخر فرع (`perf-1`) إلى `main`.

## ٢. طريقة الدمج الموصى بها

**Pull Request واحد من `perf-1` إلى `main` مع Merge commit (`--no-ff`)، لا Squash.**

- السبب: التاريخ الحالي مقسّم إلى commits صغيرة كل واحد يشرح عيباً أو قراراً
  (`fix(orders): … (BUG-001)`، `perf(js): …`). الـ merge commit يحفظ هذا السجل كاملاً،
  وهو أثر المراجعة الذي يطلبه تقرير الجودة. الـ Squash يحوّل كل ذلك إلى commit واحد
  ويضيّع ربط الإصلاحات بالأعطال.
- لا force-push على `main`، ولا دمج قبل أن يصبح CI أخضر على الـ PR نفسه.
- بعد الدمج: وسم `v1.0.0` على الـ merge commit، ثم النشر من الوسم لا من الفرع.

### وصف الـ PR (انسخه كما هو)

```
## Summary
- Phase 0-7: storefront, catalogue from data/product-master.csv, PDP, cart, guest
  checkout (COD, flat 100 EGP), owner notification (email + WhatsApp), advisor.
- refresh-2: master refresh (73 rows), is_similar relations, text-only header,
  floating advisor launcher.
- qa-sweep: 8 fixes (hidden-product orders, body cap, ORDER_CHANNELS_MODE,
  size order, checkout noindex, chat origin guard, framework header, doc drift).
- perf-1: first-load JS under budget, PDP/PLP image preload, derived-image
  fallback, perf:budget in CI, release plan.

## Metrics (mobile Lighthouse, matched profile)
| Route | Perf before | Perf after | LCP after | CLS | a11y | JS first-load (brotli) |
|---|---|---|---|---|---|---|
| / | 89 | 100 | 0.91 s | 0 | 100 | 212 KiB (was 246) |
| /shop | 87 | 88 | 3.87 s | 0 | 100 | 214 KiB (was 248) |
| /product/* | 87-89 | 88-89 | 3.79 s | 0 | 100 | 218 KiB (was 248) |
| /cart | 93 | 100 | 0.91 s | 0 | 100 | 213 KiB |
| /checkout | 92 | 100 | 0.91 s | 0 | 100 | 257 KiB (was 266) |

## Risks
- Simulated-throttling LCP on /shop and PDPs is still ~3.8 s (real DevTools
  throttling: 1.96 s, perf 97). Cause and cost are documented in
  docs/QA-Report.md and docs/Release-Plan.md §7.
- Production must serve Brotli (see §3); `next start` alone serves gzip and the
  first-load JS budget is measured on Brotli bytes.
- 11 product photos still need a retouch (list in .audit/needs-retouch.txt).
```

## ٣. متغيرات البيئة (أسماء فقط — القيم في لوحة الاستضافة)

| المتغير | الغرض | مطلوب؟ | أين يُضبط |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | الأصل الأساسي للروابط وcanonical وsitemap | نعم | لوحة الاستضافة (build + runtime) |
| `RESEND_API_KEY` | إرسال إشعار الطلب بالبريد | مع قناة البريد | أسرار المنصة |
| `OWNER_EMAIL` | صندوق استلام الطلبات | مع قناة البريد | أسرار المنصة |
| `RESEND_FROM_EMAIL` | عنوان مرسل موثّق | مع قناة البريد | أسرار المنصة |
| `CALLMEBOT_PHONE_1` / `CALLMEBOT_API_KEY_1` | قناة واتساب الأولى | مع قناة واتساب | أسرار المنصة |
| `CALLMEBOT_PHONE_2` / `CALLMEBOT_API_KEY_2` | قناة واتساب ثانية | اختياري | أسرار المنصة |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` (أو `KV_REST_API_*`) | المبيعات وتحديد المعدل المشترك | اختياري (fallback محلي) | أسرار المنصة |
| `OPENAI_API_KEY` | المساعد الذكي | اختياري | أسرار المنصة |
| `ORDER_CHANNELS_MODE` | `log` أو `fail` للاختبار فقط | **لا تضبطوه في الإنتاج** | بيئة التطوير فقط |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_EMAIL` | روابط التواصل العامة | اختياري (تُقرأ من `data/contact.json`) | بيئة البناء |

قاعدة صارمة: قناة واحدة كاملة على الأقل (بريد أو واتساب) قبل الإطلاق. لا تُطبع أي قيمة
سرية في سجل أو تذكرة، ولا تُوضع في Git.

**التشفير:** ميزانية الجافاسكربت (240 KiB) محسوبة على Brotli، لذلك يجب أن يقدّم الوكيل
العام (LiteSpeed/NGINX/Cloudflare) Brotli. مع `next start` وحده (gzip) يصبح الرقم
243-252 KiB: أعلى من الميزانية رغم أنه الملف نفسه. إعداد NGINX المقترح:

```nginx
gzip on;
gzip_types text/html text/css application/javascript application/json image/svg+xml;
brotli on;
brotli_types text/html text/css application/javascript application/json image/svg+xml;
```

## ٤. ترتيب أول نشر

1. `npm ci` على Node `24.16.0` (حسب `.nvmrc`).
2. البوابات بالترتيب: `validate-json` → `check:tokens` → `check:derived` → `typecheck`
   → `lint` → `test` → `build` → `perf:budget` → `e2e`.
3. انشروا إلى **Preview** أولاً (بيئة معاينة منفصلة بنفس الكود).
4. على المعاينة: `npm run preflight -- --url=https://preview-…`، ثم مرّوا على
   `/`، `/shop`، صفحة منتج، السلة، الدفع، وصفحة النجاح على 375 و1440.
5. **طلب تجريبي واحد بموافقة المالك** على المعاينة: تحققوا من وصول البريد وواتساب،
   ومن الإجمالي (شحن ثابت 100 ج.م)، ومن رقم الطلب بصيغة `PDF-YYYYMMDD-NNNNN`.
   بعد الاختبار احذفوا ملفات المعاينة إن وُجدت (`.tmp/order-previews` غير متعقّب).
6. إن نجح كل ذلك: Promote إلى Production. لا تُشغّلوا `ORDER_CHANNELS_MODE` في الإنتاج
   (يرفضه الكود ويُرجع 503 عند فشل كل القنوات، مع الحفاظ على السلة).
7. النطاق: وجّهوا DNS إلى المنصة بعد التحقق من TLS، ثم أرسلوا `/sitemap.xml` إلى
   Search Console. تحققوا من `/robots.txt` وcanonical و`/og-image.png`.

## ٥. التراجع (Rollback)

- **الخيار الأول:** Promote previous deployment من لوحة الاستضافة. فوري، ويحفظ البيانات.
- **الخيار الثاني:** `git revert` للـ merge commit على `main`، ووسم `v1.0.1`، ونشر جديد.
- **لا تفعلوا:** حذف بيانات الطلبات، أو إعادة نشر ملفات قديمة يدوياً، أو force-push.
- بعد أي تراجع: صفحة رئيسية + صفحة منتج + طلب تجريبي + فحص `/api/orders` قبل إعادة النشر.

## ٦. المراقبة — أول ٧ أيام

يومياً:
- 5xx/4xx على `/api/orders` و`/api/chat` (لا تُسجّل PII).
- وصول إشعارات الطلبات (بريد + واتساب)؛ أي فشل قناة يظهر كـ 503 للعميل مع بقاء السلة.
- زمن استجابة `/api/orders` (p95) وRedis إن كان مفعّلاً.
- Core Web Vitals من بيانات المستخدمين الحقيقية (LCP، CLS، INP) على `/` و`/shop` وصفحة منتج.
- Search Console: أخطاء الزحف، الصفحات المستبعدة، وأن `noindex` على السلة والدفع فقط.

بعد الأسبوع الأول: مراجعة أسبوعية لنفس المؤشرات، ومراجعة الكتالوج بعد كل تحديث لـ
`data/product-master.csv` (شغّلوا `npm run data:refresh` كتجربة أولاً).

## ٧. ما لم تصل إليه ميزانية الأداء (لقرار المالك)

`/shop` وصفحات المنتجات: Lighthouse simulation يعطي 88-89 وLCP ≈ 3.8 ثانية بينما
DevTools throttling الحقيقي يعطي 97 و1.96 ثانية. السبب أن نموذج المحاكاة يضرب وقت
الـ main thread ×٤: تحميل ٤٦ بطاقة + 46 جزيرة QuickAdd + حمولة RSC داخلية (~170 KiB).
الوصول إلى 2.5 ثانية محاكاة يحتاج تغييراً معمارياً: زر إضافة واحد مفوَّض لكل شبكة بدل
جزيرة لكل بطاقة (يقلّل الترطيب 46→1)، وإخراج كتالوج التحقق من الـ layout، وربما عرض
تدريجي للشبكة. الكلفة: ~يوم عمل + إعادة توليد اللقطات، والمخاطرة: سلوك الإضافة السريعة.

---

# Release plan (English)

## Branch stack and landing

The history is one chain: `phase-0-fixes … phase-7-release` → `refresh-2` → `qa-sweep` →
`perf-1`, all branched from one another. Land it with **one PR from `perf-1` to `main`
and a merge commit (`--no-ff`)**, not a squash: the per-fix commits carry the audit
trail (`fix(orders): … (BUG-001)`), and squashing destroys it. Tag `v1.0.0` on the
merge commit and deploy from the tag. Never force-push `main`; merge only when CI is
green on the PR itself.

## Environment (names only; values live in the host's secret store)

Required: `NEXT_PUBLIC_SITE_URL`, plus one complete order channel —
`RESEND_API_KEY` + `OWNER_EMAIL` + `RESEND_FROM_EMAIL`, or
`CALLMEBOT_PHONE_1` + `CALLMEBOT_API_KEY_1` (optional second pair `_2`).
Optional: Redis (`UPSTASH_REDIS_REST_URL`/`_TOKEN` or `KV_REST_API_*`),
`OPENAI_API_KEY`, public `NEXT_PUBLIC_WHATSAPP_NUMBER`/`NEXT_PUBLIC_EMAIL`.
`ORDER_CHANNELS_MODE` (`log`/`fail`) is development only: the code refuses it in
production, and a production build with every channel failing returns 503 while the
cart survives.

**Compression matters:** the 240 KiB first-load budget is measured on Brotli bytes
(212-218 KiB currently). `next start` alone speaks gzip (243-252 KiB — the same files,
weaker encoding), so the public proxy must enable Brotli (`brotli on;` in NGINX or the
LiteSpeed/Cloudflare equivalent).

## First deployment

1. `npm ci` on Node `24.16.0`; gates in order: `validate-json`, `check:tokens`,
   `check:derived`, `typecheck`, `lint`, `test`, `build`, `perf:budget`, `e2e`.
2. Deploy to **Preview** first; run `npm run preflight -- --url=https://preview-…`
   and walk `/`, `/shop`, a PDP, cart, checkout and success at 375 and 1440.
3. One **owner-approved test order** on the preview: confirm both notifications, the
   flat 100 EGP total and the `PDF-YYYYMMDD-NNNNN` order number.
4. Promote to Production, then point DNS and verify TLS, submit `/sitemap.xml`, check
   `/robots.txt`, canonicals and the OG image.
5. Keep `.tmp/order-previews` out of the deployed tree and out of Git.

## Rollback

Promote the previous deployment (instant, keeps data). If a revert is needed, use
`git revert` on the merge commit, tag a patch and deploy that. Never delete order data,
never redeploy stale files by hand, never force-push. After any rollback, re-check the
homepage, a PDP, one test order and `/api/orders` before going live again.

## First seven days

Daily: 5xx/4xx on `/api/orders` and `/api/chat` (no PII in logs), owner-notification
delivery on both channels, `/api/orders` p95 and Redis health, field Core Web Vitals
for `/`, `/shop` and a PDP, and Search Console crawl/index reports (only cart, checkout
and success should be `noindex`).

## Known gap (owner decision)

`/shop` and PDPs score 88-89 under Lighthouse simulation (LCP ≈ 3.8 s) while real
DevTools throttling gives 97 and 1.96 s, because the simulated model multiplies main
thread time ×4 over 46 cards, 46 quick-add islands and ~170 KiB of inline RSC payload.
Reaching 2.5 s simulated needs an architectural change: one delegated quick-add island
per grid instead of one per card, the cart-validation catalogue out of the layout, and
possibly a streamed grid. Cost ≈ one working day plus new visual baselines; risk is the
quick-add interaction.
