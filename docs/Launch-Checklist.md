# قائمة الإطلاق

## قبل النشر

- [ ] اعتمدوا اسم النطاق النهائي واضبطوا DNS وHTTPS.
- [ ] راجعوا `data/products.json` و`data/settings.json` و`data/contact.json` والأسعار والتوفر.
- [ ] أنشئوا متغيرات البيئة على منصة الاستضافة (الأسماء أدناه فقط؛ لا تضعوا الأسرار في Git):

| المتغير | الغرض | مطلوب؟ |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | عنوان الموقع الأساسي للروابط وSEO | نعم في الإنتاج |
| `RESEND_API_KEY` | إرسال إشعار الطلب بالبريد | مطلوب لقناة البريد |
| `OWNER_EMAIL` | صندوق استلام الطلبات | مطلوب لقناة البريد |
| `RESEND_FROM_EMAIL` | عنوان إرسال موثّق لدى مزود البريد | مطلوب لقناة البريد |
| `CALLMEBOT_PHONE_1` | رقم واتساب المالك بصيغة المزود | مطلوب مع مفتاح القناة |
| `CALLMEBOT_API_KEY_1` | مفتاح إرسال واتساب الأول | مطلوب مع رقم القناة |
| `CALLMEBOT_PHONE_2` | رقم واتساب ثانٍ | اختياري |
| `CALLMEBOT_API_KEY_2` | مفتاح واتساب ثانٍ | اختياري |
| `UPSTASH_REDIS_REST_URL` أو `KV_REST_API_URL` | Redis للمبيعات وتحديد المعدل المشترك | اختياري؛ يوجد fallback محلي محدود |
| `UPSTASH_REDIS_REST_TOKEN` أو `KV_REST_API_TOKEN` | اعتماد Redis | اختياري؛ يوجد fallback محلي محدود |
| `OPENAI_API_KEY` | المساعد الاختياري | اختياري |

  يجب إعداد قناة واحدة كاملة على الأقل في الإنتاج (البريد أو واتساب). لا تشاركوا قيمة أي سر في البريد أو التذكرة.
- [ ] اضبطوا إصدار Node.js على `24.16.0` حسب `.nvmrc` و`package.json`، وشغّلوا `npm ci`.
- [ ] شغّلوا `npm run validate-json`, `npm run check:tokens`, `npm run check:derived`, `npm run typecheck`, `npm run lint`, `npm test`, ثم `npm run build`.
- [ ] انشروا إلى بيئة معاينة/preview أولاً، ثم اختبروا الهواتف والكمبيوتر والروابط والصور.
- [ ] شغّلوا `npm run preflight -- --url=https://اسم-النطاق`؛ لا تطلقوا إذا كانت النتيجة فاشلة.

## اختبار طلب حقيقي (TEST ORDER)

1. استخدموا قناة داخلية أو اطلبوا اختباراً صغيراً حقيقياً بموافقة المالك.
2. أضيفوا منتجاً متاحاً، أكملوا الاسم ورقم الهاتف والمحافظة والعنوان، ثم أرسلوا الطلب مرة واحدة.
3. تحققوا من صفحة النجاح ورقم الطلب، ومن وصول تفاصيل الطلب إلى البريد أو واتساب.
4. تأكدوا من ظهور السعر الصحيح والشحن الثابت الحالي 100 جنيه. لا تستخدموا بيانات زبون حقيقية دون داعٍ.
5. اختبروا استجابة 503 في المعاينة إن أمكن: يجب أن تبقى السلة والبيانات المدخلة ولا ينتقل المستخدم لصفحة النجاح.

## النطاق وSEO

- [ ] تأكدوا من أن DNS يشير إلى المنصة وأن شهادة TLS فعالة.
- [ ] راجعوا `/robots.txt` و`/sitemap.xml` والروابط الأساسية في الصفحة.
- [ ] أرسلوا خريطة الموقع إلى Google Search Console بعد التأكد من النطاق النهائي.
- [ ] اختبروا معاينة المشاركة الاجتماعية باستخدام `/og-image.png`.
- [ ] راجعوا canonical وبيانات Product/Breadcrumb في الصفحات الأساسية.

## الأسبوع الأول

- راقبوا سجلات 4xx/5xx وزمن استجابة `/api/orders` و`/api/chat`.
- تأكدوا من وصول إشعارات الطلبات لقناة المالك يومياً.
- راقبوا أخطاء مزود البريد وواتساب ومفاتيحهم، وراقبوا Redis إن كان مفعّلاً.
- لا تسجلوا أسماء العملاء أو هواتفهم أو عناوينهم في سجلات التطبيق.
- راجعوا أداء الهاتف وCore Web Vitals وSearch Console بعد جمع بيانات فعلية.

## التراجع عن إصدار

إذا ظهر خلل بعد الإطلاق، أوقفوا الترويج للإصدار الجديد واستخدموا خيار Rollback/Promote previous deployment في لوحة الاستضافة للعودة إلى آخر إصدار ناجح. لا تعيدوا نشر ملفات قديمة يدوياً ولا تحذفوا بيانات الطلبات. بعد التراجع، تحققوا من الصفحة والطلب التجريبي ثم أصلحوا المشكلة في فرع مستقل وأعيدوا الفحوصات قبل إعادة الإطلاق.

---

# Launch checklist (English)

- Configure the final hostname, DNS, and HTTPS. Set Node.js to `24.16.0` and configure `NEXT_PUBLIC_SITE_URL` to the canonical origin.
- Set secrets in the hosting platform, never in Git. Production requires at least one complete order channel: `RESEND_API_KEY` + `OWNER_EMAIL` + `RESEND_FROM_EMAIL`, or `CALLMEBOT_PHONE_1` + `CALLMEBOT_API_KEY_1`. Redis (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL`/`KV_REST_API_TOKEN`) and `OPENAI_API_KEY` are optional.
- Install with `npm ci`; run JSON validation, token checks, derived-image checks, typecheck, lint, unit tests, and production build. Deploy to preview, then run `npm run preflight -- --url=https://your-domain`.
- Make one approved test order and verify its exact total, current flat shipping amount, owner notification, success screen, and retry behavior. Avoid using real customer details.
- Submit `/sitemap.xml` to Search Console, verify `/robots.txt`, canonicals and `/og-image.png` previews.
- During week one, monitor 4xx/5xx, API latency, order-channel delivery, Redis (if configured), and Core Web Vitals without logging PII.
- Roll back using the hosting provider's previous-deployment rollback/promote control, then verify the site and a test order. Preserve order data and fix forward on a separate branch.
