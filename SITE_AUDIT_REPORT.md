# SITE AUDIT REPORT — Parfums De Foda

**Audit date:** 2026-10-20
**Audited revision:** `main` @ working tree clean (commit `6a5914e`, "feat: order confirmation screen")
**Method:** full source read, local production build (`next build` + `next start`), live DOM probing in Chromium, Lighthouse 12 (mobile emulated + desktop preset), `npm audit`, data analysis of the JSON catalog.
**Scope:** analysis only. No product code was modified. The only file created in the repo is this report.

---

## 1. Executive Summary

1. The foundation is solid engineering — strict TypeScript, 97 passing tests, clean lint/typecheck, a validated JSON data layer, and static generation of all 40 product pages.
2. The site is not yet premium: the UI runs on **11 competing font sizes (max 24px)**, **12 different corner radii**, 12 hand-written shadows, and 8 raw hex colours that bypass the design tokens that already exist but are never used.
3. Contrast is the single most damaging visual problem: the primary CTA is **white on `#9CD676` = 1.71:1** (WCAG requires 4.5:1); five more token-level contrast failures were measured on every card.
4. The product card is overloaded — image, house badge, gold "فاخر" badge, name, "اختر الحجم" label, 4 size pills, price, tax note, a pale shipping chip and **two full-width CTAs** — 655px tall at 304px wide on desktop and 677px on mobile (83% of a phone screen per product).
5. Critical correctness bug: the store **charges 100 EGP shipping** (`SHIPPING_FEE`) while `data/settings.json` says **60 EGP, free above 500** — the settings value is literally discarded, and the free-shipping promise is implemented nowhere.
6. Critical responsive bug: on tablets (768–1023px) **the filter UI does not exist at all** — the toggle is `md:hidden`, the sidebar is `hidden lg:block`.
7. Critical SEO bug: every product page declares `canonical` → `https://parfumsdefoda.com/` (homepage), so 40 product pages compete as duplicates of the front page; titles also render doubled ("… | Parfums De Foda | Parfums De Foda").
8. Critical security/privacy bug: `GET /api/orders` returns **every order with customer name, phone and address**, unauthenticated; orders live in an in-memory array that Vercel discards.
9. Lighthouse: home **81 / 87 / 100 / 100** (mobile), PDP **93 / 89 / 100 / 100**, desktop home **94 / 84 / 100 / 100** — accessibility, not performance, is the weak axis.
10. The catalogue itself is the hidden blocker: 40/40 products have empty fragrance notes, 0 reviews, identical brand, one "نسائي" product, and every image is a 2000×2000 PNG (18.1 MB total). No redesign can feel luxurious on this data.

---

## 2. Tech Stack and Architecture Overview

### 2.1 Stack (from `package.json`)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.10 |
| UI runtime | React / React DOM | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) — **no `tailwind.config.*`**, CSS-first `@theme` | ^4 |
| Component kit | Shadcn/UI "base-nova" over `@base-ui/react` (not Radix) | 1.6.0 |
| Animation | Framer Motion | ^12.42.2 |
| Forms | React Hook Form + `@hookform/resolvers` | 7.81.0 / 5.4.0 |
| Validation | Zod | ^4.4.3 |
| Icons | lucide-react | ^1.24.0 |
| Variants | class-variance-authority, tailwind-merge, clsx | — |
| Data | 18 JSON files via `node:fs/promises` (`src/lib/json-loader.ts`) | — |
| Cache/counters | `@upstash/redis` | ^1.38.2 |
| Email | `resend` | ^6.18.1 |
| WhatsApp notify | CallMeBot HTTP API (`src/lib/whatsapp.ts`) | — |
| AI chat | `openai` | ^7.10.0 |
| Tests | Vitest (11 files, 97 tests) | ^4.1.10 |
| Build tool | Next.js Turbopack (`next build`) | — |
| Package manager | npm (`package-lock.json` present) | npm 11.13.0 / Node 24.16.0 |
| Hosting | Vercel (`.vercel/repo.json`, project `prj_2MpnLqBpDkLXgQvaQcAobTAVRJv0`) | — |

There is **no database, no CMS, no auth, no payment gateway, and no image CDN**. Commerce is: local JSON → server component → client state (localStorage cart) → `POST /api/orders` → Resend email + CallMeBot WhatsApp to the owner.

### 2.2 Rendering architecture and its one deviation

`next build` output (verbatim route table):

```
┌ ƒ /                    ← DYNAMIC (server-rendered per request)
├ ○ /_not-found
├ ƒ /api/chat
├ ƒ /api/orders
├ ○ /checkout
├ ○ /checkout/success
└ ● /product/[slug]      ← 40 SSG paths
```

The homepage is **`ƒ` dynamic**, contradicting `AGENTS.md` ("Static output. All routes pre-rendered at build time except `/api/orders`"). Cause, from the build log:

```
[sales-tracking] Failed to fetch product sales counts:
Dynamic server usage: Route / couldn't be rendered statically because it used no-store fetch
```

`page.tsx:29` awaits `getProductSalesCounts()` (`src/lib/sales-tracking.ts`), which calls Upstash. Because that fetch is `no-store`, Next opts the whole homepage out of static rendering. Practical cost: every homepage visit re-reads 5 JSON files from disk, re-runs the Redis call, and re-renders 40 cards server-side. Locally, cold TTFB was **4.5 s**, warm **10–17 ms**.

### 2.3 Environment variables (names only)

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_EMAIL`, `OPENAI_API_KEY`, `OWNER_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CALLMEBOT_PHONE_1`, `CALLMEBOT_API_KEY_1`, `CALLMEBOT_PHONE_2`, `CALLMEBOT_API_KEY_2`, `CHAT_URL`, plus Upstash's `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`) read indirectly by `Redis.fromEnv()`.

`.env`, `.env.local`, `.env.development.local` exist locally and are **not** tracked by git (`.gitignore:33-46`). Values were not read or printed.

Locally only `NEXT_PUBLIC_*` are set: the build prints `[Upstash Redis] Unable to find environment variable` six times and `Redis client was initialized without url or token`. Email/WhatsApp keys are absent, which the orders route swallows in `try/catch` (`src/app/api/orders/route.ts:79-105`).

### 2.4 Does it run?

Yes. `npm run validate-json` ✅, `npm run typecheck` ✅ (clean), `npm run lint` ✅ (clean), `npm run test` ✅ 97/97 in 11 files (494 ms), `npm run build` ✅ 47/47 static pages in 5.2 s. Dev server started on `:3123`; production server on `:3124`, HTTP 200.

---

## 3. Site Map and Navigation Structure

### 3.1 Every route that exists

| Route | File | Purpose | Rendering |
|---|---|---|---|
| `/` | `src/app/page.tsx` | The **entire** storefront: hero marquee, search, filters, 40-card grid, FAQ, policies, contact | dynamic |
| `/product/[slug]` | `src/app/product/[slug]/page.tsx` | Product detail (40 generated) | SSG |
| `/checkout` | `src/app/checkout/page.tsx` | 6-field form + order summary | static shell + client cart |
| `/checkout/success` | `src/app/checkout/success/page.tsx` | Confirmation + order number | static |
| `/api/orders` | `src/app/api/orders/route.ts` | POST create order / **GET all orders** | dynamic |
| `/api/chat` | `src/app/api/chat/route.ts` | AI perfume advisor | dynamic |
| 404 | `src/app/not-found.tsx` | Not found | static |
| error | `src/app/error.tsx` | Error boundary | client |

**Routes that do not exist but a perfume store needs:** `/shop` or category pages, `/search`, `/about`, `/contact`, `/policies/*`, `/account` or `/orders`, `/wishlist`, `/cart`, `/admin`. There is no sitemap route for products either.

### 3.2 Navigation as built

- **Header** (`src/features/layout/components/header.tsx`): logo (80px tall, right), then 2 nav links from `data/navigation.json` — `الرئيسية` and `اتصل بنا` (an anchor `/#contact`) — separated by vertical `Separator`s, then cart icon (left). Desktop hides on scroll-down, reveals on scroll-up / mouse near top (`header.tsx:95-165`). `h-24` = **97px** header.
- **Mobile header**: logo + cart, plus a filter (≡) button **only on the homepage** (`header.tsx:201-215`). On a product page there is **no menu at all** — the only way out is the logo or breadcrumb.
- **Footer** (`footer.tsx`): one description paragraph, two columns ("روابط سريعة" with a single link, "تواصل معنا" with WhatsApp + Instagram), copyright. No newsletter, no payment/trust marks, no policies links.
- **Breadcrumbs**: only on the product page (`product-detail-page.tsx:118-140`), hardcoded Arabic, no BreadcrumbList schema.
- **Filters/sorting**: a single sidebar `aside` that contains *both* facets and sort options; on mobile it is a custom overlay (`filter-sidebar.tsx:50-95`).
- **Search**: one input on the homepage only (`search-bar.tsx`). No header search, no search page, no suggestions.
- **Mega menu**: none. **Categories**: none — `data/categories.json` is `[]` and nothing renders from it.

### 3.3 End-to-end journeys (measured clicks)

Happy path as coded: add-to-cart (1) → cart icon opens drawer (2) → `إتمام الطلب` (3) → fill 6 fields → `تأكيد الطلب` (4). "اشتر الآن" shortcut: (1) add + navigate, (2) submit. So the "4 clicks" rule holds technically.

Friction and dead ends found:
1. Adding to cart does **not** open the drawer — only a 3-second toast at the bottom-centre, which is partly covered by the floating chat card on mobile.
2. There is **no cart page**; the drawer is the only cart view, so it cannot be bookmarked or linked.
3. `/checkout` with an empty cart dead-ends on "سلة التسوق فارغة" with one button home (correct, but reachable by refresh after success).
4. **No way to continue shopping from the empty drawer** (no CTA inside the drawer).
5. Product page has no "related products", so every PDP **is** a dead end after a decision.
6. The success screen tells the customer to share the order number on WhatsApp but provides **no WhatsApp link** (`checkout/success/page.tsx` has only "العودة للمتجر").
7. There is no order tracking, no account, no email to the customer — only the owner is notified.
8. Filters give no result count and no URL state: refreshing or sharing loses all filtering (state lives in `useProducts` `useState`).
9. On tablet, filtering is impossible (see §6.2).

### 3.4 Product taxonomy — and why it does not fit a fragrance house

Facets shipped (`data/filters.json`): الجنس (3), النوع (2), الدار (3), عطور زيتية (1), فوده (1), فاخر (1), الأداء (4), الترتيب (4). Missing: scent family (خشبي/شرقي/زهري/حمضي/جلدي), occasion, season (deliberately removed — `filter-helpers.ts:6-10`), price range, size, concentration.

Catalogue reality (computed from `data/products.json`):

| Dimension | Distribution |
|---|---|
| Products | **40** (docs claim 47) |
| `gender` | رجالي 19 · للجنسين 20 · **نسائي 1** |
| `type` | شرقي 20 · غربي 20 |
| `house` | نيش 28 · ديزاينر 10 · دووب 2 |
| `performance` | 4 buckets (أداء ضعيف/متوسط/قوي/صاروخي) |
| `featured` | 8 |
| `rating` / `reviews` | **0 / 0 for all 40** |
| `notes` (top/middle/base) | **empty for all 40** |
| `brand` | "Parfums De Foda" for all 40 |
| `seo.description` | empty for all 40 |
| Price range (any size) | 120 – 950 EGP |
| Out of stock | 5 (all sharing `placeholder-unavailable.webp`) |
| `badge` | "" ×35, **"غير متوفر حالياً" ×5** |

Two structural problems follow. First, "الدار" is the only brand-ish facet, while the real house name (e.g. "ميمو باريس", "توم فورد") lives only inside the free-text `description`. Second, a filter that returns **one** product (نسائي) is worse than no filter — it reads as an empty shop.

### 3.5 Product data model vs. what luxury fragrance needs

Present (`src/schemas/product-schema.ts`): `id, sku, slug, name, brand, description, image, gallery[], gender, type, house, oily, fodaOriginal, season, performance, featured, badge, rating, reviews, status, sortOrder, sizes[{label,price,inStock}], inStock, notes{top,middle,base}, seo{title,description}`.

Missing and materially needed:
- **Concentration** (EDP / EDT / Parfum / Extrait) — decisive for a perfume buyer.
- **Size as a number** (`ml: 100`) — today sizes are Arabic strings ("100 مل") used as React keys and cart identity; sorting/filtering by size is impossible.
- **Compare-at price / discount** — no way to express a sale; `badge` is a free string with no colour contract.
- **Stock quantity** — only booleans, so "آخر قطعة" urgency is impossible.
- **Real reviews** (author, rating, body, date, photos) — `rating`/`reviews` are numbers with no source; all zero.
- **Per-size images / lifestyle imagery / video** — `gallery` has >1 image on only 2 of 40 products; no hover image.
- **Brand entity** (id, logo, story) — "brand" is one hardcoded string.
- **Notes with imagery/proportion** — today names only, and empty.
- **Tags / occasion / seasonality as facets** — `season` exists but is excluded from filters.
- **Cost & margin** — irrelevant to UI but needed for pricing control.

---

## 4. Design System Findings

### 4.1 Tokens that exist

`src/app/globals.css:13-73` defines brand colours, a 10-step neutral ramp, semantic colours, 5 background levels, borders, 3 spacing tokens, 3 radii, 3 shadows, 3 animation durations. `data/theme.json` mirrors colours/spacing/radius/shadows. `docs/Design-System.md` documents 4 colours and claims an 8pt spacing system.

### 4.2 Tokens that are actually used

| Token group | Declared | Consumed by components |
|---|---|---|
| Colours (`--color-*`) | primary/secondary/accent/gold + success/warning/error/info | secondary, accent, gold, success, error — **warning/info never used** |
| Neumrals | 50–900 | 100–800 used; 50/900 almost never |
| `--shadow-card`, `--shadow-card-hover`, `--shadow-drawer` | 3 | **0 usages** (grep `var(--shadow` → no matches) |
| `--radius-card` / `--radius-button` | 2 | **0 usages** |
| `--spacing-section` / `--spacing-card-gap` | 2 | **0 usages** (`py-8`, `py-12`, `gap-6` used instead) |
| theme.json `typography`, `animations` | full block | **never read** — `ThemeProvider.tsx:31-38` injects only `colors` |

So the "owner edits `data/theme.json`" promise holds for **four colours only**. Changing `spacing.section`, `radius.card`, or `typography.headingWeight` in JSON has zero effect — verified: the only consumer of the theme object is `ThemeProvider`, and it iterates `Object.entries(initialTheme.colors)`.

### 4.3 Typography — measured on the live homepage

Computed styles of all leaf text nodes at 1440px:

| Font size | Nodes | | Weight | Nodes |
|---|---|---|---|---|
| 10px | 141 | | 400 | 80 |
| 11px | 41 | | 500 | 243 |
| 12px | 161 | | 600 | 131 |
| 12.8px | 2 | | 700 | 99 |
| 13px | 41 | | 800 | 10 |
| 14px | 68 | | | |
| 16px | 17 | | | |
| 18px | 41 | | | |
| 20px | 2 | | | |
| 24px | 41 | | | |
| **8px** | 8 | | | |

Findings:
- **11 distinct sizes, 5 weights, and a ceiling of 24px.** Nothing on the homepage is larger than 24px. There is no display scale, so no hierarchy: 41 nodes at 24px and 41 at 18px are section headings and card titles competing at almost the same weight.
- **10px Arabic text (141 nodes) is illegible.** Cairo's Arabic glyphs need ≥14px; 10px uppercase tracking labels ("وصف المنتج", "اختر الحجم", "شامل الضريبة", badges) are decoration, not information.
- Line-height at 12–13px body text is 15–18px (1.2–1.38) — cramped for Arabic, which needs 1.6–1.8.
- Only one family (Cairo, `fonts.ts` loads weights 300–800, `subsets: ["arabic"]`). A single weight axis at six weights is heavy: 6 font files preloaded for a page that barely uses 300/600.
- No responsive type scale (`clamp()`/fluid type absent): the PDP H1 jumps `text-3xl → md:text-4xl` and that is the only fluid step on the site.

### 4.4 Colour

Palette: `#FFFFFF` (primary), `#9CD676` (secondary/green), `#632989` (accent/purple), `#D4AF37` (gold), neutral grays, `#10B981/#F59E0B/#EF4444/#3B82F6` semantics.

- Three brand accents (green, purple, gold) are used **simultaneously** in one card: green CTA, purple price + selected pill, gold badge/Buy Now. That is not a restrained palette; it is three brands.
- Raw hexes bypass tokens: `#d4af37` ×8, `#f5d060` ×8, `#b8960c` ×8, `#4a1f6b` ×2, `#7b3ba8`, `#fdf8e8`, `#632989`, `#FFFFFF` — i.e. the gold gradient trio is hand-typed 24 times, so changing `--color-gold` will **not** update any gold gradient in the UI.
- Backgrounds: white cards on white page, with a cream/gold tint for featured cards and a lavender/cream animated mesh behind the marquee (`globals.css:245-262`). The mesh uses three more hardcoded hexes.

Measured contrast (WCAG 2.1 formula, live DOM):

| Element | Foreground / Background | Ratio | Verdict |
|---|---|---|---|
| Primary CTA "أضف إلى السلة" | `#FFFFFF` on `#9CD676` | **1.71:1** | fails AA/AAA (needs 4.5) |
| "اختر الحجم" label | `#D1D5DB` on `#FFFFFF` | **1.47:1** | fails |
| Shipping chip text | `#9CD676` on `#F5FBF1` | **1.62:1** | fails |
| House badge (featured card) | `#D4AF37` on `#FBF7EB` | **1.96:1** | fails |
| "شامل الضريبة" | `#9CA3AF` on `#FFFFFF` | **2.54:1** | fails |
| Footer copyright | `#9CA3AF` on `#FAFAFA` | **2.43:1** | fails |
| Price | `#632989` on `#FFFFFF` | 9.51:1 | pass |
| Buy Now | `#111827` on `#D4AF37` | 8.44:1 | pass |

Lighthouse independently flags `color-contrast` with 3 nodes (mobile home) and 6 (desktop home, PDP mobile).

### 4.5 Spacing and layout

- Container: Tailwind default `container mx-auto px-4` → **1280px** at 1440 with 16px gutters.
- Grid: `gap-6` (24px); cards 304px wide at 1440; sidebar 256px; content 960px.
- Section rhythm: hero `py-0`, storefront `py-8` (**32px**), FAQ/policies/contact `py-12` (**48px**). Nothing in the page uses the 5rem/80px `--spacing-section` token; the storefront is dense, not spacious.
- Card padding 16px on all sides; typographic gaps 4/6/8/12px.
- Claimed "8pt system" (`docs/Design-System.md`) is broken by `gap-1.5` (6px), `gap-2.5` (10px), `h-11` (44px), `size-6/7` (24/28px), `text-[13px]`.

### 4.6 Radius, shadow, elevation

Radius classes in `src/**/*.tsx`: `rounded-full` 46, `rounded` 41, `rounded-lg` 25, `rounded-2xl` 9, `rounded-xl` 8, `rounded-md` 4, `rounded-3xl` 3, plus `rounded-4xl`, `rounded-none`, `rounded-bl/br/b`. **12 variants** — pill buttons, 8px buttons, 12px cards, 16px cards, 24px cards and full circles coexist. Apple-level craft requires 2–3.

Shadows: 12 unique arbitrary `shadow-[…]` strings (e.g. `0_2px_16px_rgba(0,0,0,0.04)`, `0_16px_48px_rgba(212,175,55,0.3)`, `0_20px_60px_rgba(0,0,0,0.18)`), plus gold-tinted glows for featured cards — and zero use of the three tokens declared for exactly this purpose.

### 4.7 Component inventory and drift

Installed primitives (`src/components/ui/`): Button, Sheet, Accordion, Input, Checkbox, Badge, Label, Separator, Skeleton, Dialog.

| Component | Variants declared | Actual usage |
|---|---|---|
| `Button` | 6 variants × 8 sizes, `rounded-lg` default | Overridden almost everywhere with `rounded-full`, `bg-[var(--color-gold)]`, `h-10/h-12`, custom shadows; the "default" green/white combination is the contrast failure above |
| `Badge` | Shadcn badge | Unused in the product card, which hand-rolls badge markup (`product-card.tsx:255-275`) |
| `Skeleton` | 1 | `src/features/skeletons/*` (5 components) are **never imported anywhere**; `loading.tsx` hand-writes divs |
| `Sheet` | RTL fix in `globals.css:120-124` | Cart drawer; close button label is hardcoded English `Close` (`sheet.tsx:88`) |
| `Checkbox` | base-ui | Label association broken (see §8.2) |
| `Dialog` | — | Unused outside chat |

Duplicates: the cart line-item (image + name + size + stepper + price + trash) is implemented twice — `cart-drawer.tsx:150-210` and `checkout-page.tsx:176-243` — with different class strings and different aria labels (`- الكمية` vs `نقص الكمية`). The product-add-to-cart state machine (`idle → loading → success`) is implemented twice (`product-card.tsx:150-170`, `product-detail-page.tsx:80-100`).

---

## 5. Product Card Deep Dive

`src/features/products/components/product-card.tsx` (468 lines, `memo`, client component). Full source in **Appendix C**.

### 5.1 Structure and element order

```
<article rounded-2xl border shadow, hover:-translate-y-1, fade-in via IntersectionObserver>
 ├─ <div overflow-hidden>                        ← image zone
 │   ├─ <Link href=/product/slug tabIndex=-1>     ← whole image is a link
 │   │   └─ <div aspect-square> <Image fill object-contain p-4 />
 │   ├─ badge pill (absolute top-3 end-3)        ← optional
 │   └─ FeaturedBadge + gold shimmer overlay     ← only if featured
 └─ <div flex-1 flex-col gap-3 p-4>
     ├─ house badge pill (الدار)                  ← optional
     ├─ name (Link or h3, text-lg, line-clamp-1)
     ├─ "وصف المنتج" label + 2-line description   ← DEAD: never receives data
     ├─ "اختر الحجم" label + 4 size pills (flex-1)
     ├─ price (text-2xl purple) + "شامل الضريبة"
     ├─ shipping chip (green pill)
     └─ two stacked buttons: "اشتر الآن" (gold), "أضف إلى السلة" (green)
```

### 5.2 Image handling

- `aspect-square`, `object-contain`, `p-4` → product photos float in a 272px box; because sources are transparent PNGs of bottles on white, the result reads as a stock-photo thumbnail, not a campaign shot.
- **No hover image swap, no zoom, no second image.** `gallery` exists in data but the card only ever uses `image`.
- `loading="lazy"` on **above-the-fold** cards: Lighthouse reports the LCP element on mobile is exactly this lazy `<img alt="أفريكان ليذر">` (`lcp-lazy-loaded` audit fails on all three runs).
- `quality={85}` is **not configured**: `next.config.ts` has no `images.qualities`, so Next warns 38× per page (`Image … using quality "85" which is not configured in images.qualities [75]`) and serves the default anyway.
- `fill` inside a **statically positioned** wrapper: console warns three times per page — `Image … has "fill" and parent element with invalid "position". Provided "static" should be one of absolute,fixed,relative`. The image therefore positions against the outer `article` (which is `relative`), not the aspect box; any change to card padding will silently deform the image.
- No placeholder/blur, no `srcset` beyond Next's `sizes` (which is correct per column count, `product-card.tsx:96-108`), no AVIF source assets (18.1 MB of 2000×2000 PNGs, `public/products/`).

### 5.3 Typography hierarchy inside the card

Name `text-lg` (18px, 700/800) → price `text-2xl` (24px, 700, purple) → size pills 12px → shipping chip 11px → labels 10px. Three different "importance" signals (size, weight, colour) fight: the only 24px element is the price, while the name is 18px and the CTA text is 13–14px. There is no brand line (brand is identical for all 40 products), no concentration, no notes.

### 5.4 Price, discounts, badges

- One price, no compare-at, no "from" price, no discount.
- `resolveBadgeLabel()` maps only 4 known strings; anything else passes through raw. Result: **5 products render a gold badge reading "غير متوفر حالياً"** because that string sits in `badge`, not in stock logic.
- Featured products get *four* simultaneous premium signals: cream background, gold double border (`backgroundClip: padding-box, border-box` with a 5-stop gradient), `FeaturedBadge` "★ فاخر", and a gold hover shimmer — plus a gold shadow. This is the opposite of restraint, and it appears on 8/40 cards plus 8/12 hero frames.

### 5.5 Interaction states

- Hover: `hover:-translate-y-1` (+ `scale-[1.01]` when featured), shadow swap, image `scale-[1.03]`, name → purple. Motion is 300–500ms `ease-out`, reasonably tuned.
- Focus: card links and pills have `focus-visible` rings; the image link is `tabIndex={-1}` (good — avoids double tab stops).
- Add-to-cart: `idle → loading (spinner, 350ms) → success (check, 1.5s) → idle`. The **toast fires immediately** at click (`home-page.tsx:161`) while the button still shows a spinner — two competing confirmations for one action.
- **Buy Now** adds to cart and immediately navigates (`product-card.tsx:400-410`), with a `setState` after `router.push` in the PDP variant (`product-detail-page.tsx:378-395`) — a state update on a route being unmounted.
- No wishlist, no quick view, no compare, no stock urgency, no "آخر قطعة".

### 5.6 Responsive behaviour (measured)

| Viewport | Grid | Card size | Result |
|---|---|---|---|
| 375px | 1 col | 326 × 677 | **83% of the viewport height per product**; 40 products = 12,089px page (~15 screens) |
| 768px | 2 col | ~347 wide | filters unreachable (see §6.2) |
| 1024px | 3 col + 256px sidebar | **213 × 564** | four size pills squeezed to 40–49px each; label text at 12px clips; 3 columns + sidebar is too tight |
| 1440px | 3 col | 304 × 655 | 2.15:1 aspect — tall, dense, no breathing room |

### 5.7 What makes it feel cheap vs. premium

1. Two full-width CTAs of different colours stacked — the single loudest signal that this is a discount store.
2. A pale-green shipping chip that says "مصاريف الشحن ١٠٠ ج.م فقط" on every one of 40 cards — pure noise, repeated 40×, in 1.62:1 contrast.
3. Four size pills ("10 مل / 30 مل / 50 مل / 100 مل") on every card — the shopper must choose a volume before they know the product.
4. Three micro-labels at 10px in `#d1d5db` that cannot be read.
5. Gold-on-cream + green + purple tri-colour card.
6. Empty description block (dead code) leaves an unbalanced gap between name and size row.
7. Uniform 12px radius + shadow on everything, with a hard border — no depth discipline.
8. Photos from different sources (transparent PNG cut-outs vs. beige studio backgrounds, e.g. the Amouage card) with no shared treatment.
9. Everything above the fold is a grid: no editorial, no story, no curation.

---

## 6. Page-by-Page Findings

### 6.1 Homepage (`/`)

Observed at 1440×900 and 375×812.

- **No `<h1>` on the page.** Heading order starts at H2 ("اكتشف تشكيلتنا الفاخرة"). Lighthouse `heading-order` fails; SEO and screen-reader users get no document title-in-page.
- Hero = infinite marquee of 12 product frames, **8 of them gold-framed "★ فاخر"**. It duplicates 12 links and marks the duplicate track `aria-hidden="true"` while leaving 12 focusable `<a>` inside → `aria-hidden-focus` violation and 24 tab stops before search.
- The marquee is the only "hero": no value proposition, no headline, no CTA. `content/homepage.json` has `hero.title = "اكتشف عالم الفخامة"` and `content/hero.json` is empty — neither is rendered. The two prepared hero images (`public/images/hero-desktop.webp`, `hero-mobile.webp`, 64KB) are **never referenced**.- Search input sits alone, right-aligned in a `max-w-md`, below the hero; the product grid begins immediately (§screenshot).
- Filter sidebar: 8 groups stacked, no option counts, no collapsible groups, own scrollbar inside a 256px column. Sort options are *inside* the same sidebar as checkboxes but rendered as toggling pills — an interaction mismatch (radio behaviour in a checkbox list).
- Grid: 40 cards, no pagination, no "load more", no category rails, no curation. At 375px the page is 12,089px tall.
- Section order after the grid: FAQ (3 items) → Policies (3 accordions) → Contact (WhatsApp/e-mail buttons). All three are dense, text-only blocks with 48px padding and identical `<h2>` sizes — the page ends in three look-alike sections.
- Footer: one link per column; no payment badges, no policy links, no newsletter.
- Floating chat card (bottom-start) overlaps the filter column at 1440×900 and the CTA area at 375×812.

### 6.2 Catalogue/filtering surface (part of `/`)

- **Tablet 768–1023px: no filters at all.** `filter-sidebar.tsx:43` = `hidden lg:block`; `header.tsx:208` = `md:hidden`. Verified live at 768px: `filterBtn.display = none`, `aside.display = none`, grid 2×347px. Every iPad user gets 40 unfilterable cards.
- Mobile filter overlay (`filter-sidebar.tsx:50-95`) is a plain `<div class="fixed inset-0 z-50">` with a `bg-black/50` scrim and **no `role="dialog"`, no focus trap, no Escape handler, no body scroll lock** — verified: `body overflow: visible`, `document.activeElement` stays `BODY`. Keyboard users tab straight into the page behind it.
- No filter counts, no applied-filter chips near the grid (only an "إزالة التصفية (n)" text row), no URL sync, no "clear single group".

### 6.3 Product detail (`/product/[slug]`)

Observed at 1440×900 and 375×812, on `/product/pf020`.

- Two-column layout (gallery left in RTL: right), info column right. Breadcrumb at top.
- **Big empty gutters in the info column**: the details grid (`grid-cols-2`) places label+value pairs flush to their column's start, so half of every cell is blank, and `الأداء` spans two columns leaving a visible hole before `الوصف`.
- Metadata presented as a spec sheet (الجنس/النوع/الدار/الفصل/الأداء) — utilitarian, not editorial. Brand line says "Parfums De Foda" while the bottle is Memo Paris African Leather: the customer cannot see whose perfume it is.
- **No fragrance notes** (data is empty), so `ملاحظات العطر` never renders even though the component supports it.
- **No reviews section and no rating** (rating 0 → the star block is skipped entirely). No social proof of any kind.
- Size pills include the price inside the pill ("10 مل ١٢٠ ج.م"), duplicating the large price below.
- Gallery: single image for 38/40 products, `object-contain p-6`; **no zoom, no hover-swap, no full-screen, no video**. Thumbnails only when `gallery.length > 1`.
- CTAs: gold "اشتر الآن" full width + green "أضف إلى السلة" full width (same two-CTA pattern as the card).
- No shipping estimate, no returns note, no authenticity guarantee, no delivery promise, no gift option, no related/recently-viewed, no size guide.
- **`#main-content` does not exist on this route** (`PageLayout` is used, but the container never sets the id), so the skip link `href="#main-content"` is a no-op — Lighthouse `skip-link` fails here only.
- **Header has no navigation on mobile** and the logo `<Image alt>` is empty (`logoAlt ?? storeName`, both unset from `PageLayout`), producing Lighthouse `link-name`: "Links do not have a discernible name".
- Breadcrumb uses `ChevronRight` in RTL without flipping (transform: none).

### 6.4 Cart drawer (`src/features/cart/components/cart-drawer.tsx`)

- Opens from header; content: 16px thumbnail, name, size, 24px stepper buttons, line total, 12px trash, divider.
- `SheetDescription` renders "**1 الكمية**" — a raw count glued to a label (grammatically wrong; should be "الكمية: ١").
- Totals: `المجموع` (subtotal, unlabelled as such), `مصاريف الشحن ١٠٠`, `الإجمالي`. No free-shipping progress, no coupon, no gift note, no delivery estimate, no trust line.
- **Fixed 100 EGP shipping** regardless of `settings.json`; no `freeAbove` logic anywhere.
- Touch targets: stepper/remove **24×24**, close **28×28** — below the 44px guideline (and iOS HIG).
- Empty state: emoji 🛒 in a grey circle ("سلة التسوق فارغة") with **no "continue shopping" button**.
- Close button label is `Close` (English, from `sheet.tsx:88` `sr-only`).
- Scrim is `bg-black/10`, so the drawer barely separates from the page.

### 6.5 Checkout (`/checkout`)

- Two-column RTL: form (right), summary (left, `sticky top-24`). On mobile the summary comes **after** the form (`order-2`), so the customer must scroll past 6 fields to see the total, then scroll back up to submit.
- Six fields: name, phone, WhatsApp, governorate, city (dependent select), address details. Validation is Zod (`src/schemas/checkout.ts`) with good Arabic messages and Egyptian mobile regex.
- **No `autocomplete` attributes and no `inputMode`** on any field (verified in DOM) — mobile autofill cannot help; phone gets `type=tel` + `dir=ltr` (good).
- **Payment method is never displayed.** `paymentMethod: "الدفع عند الاستلام"` is only inside the POST payload; the summary panel has items + totals only. The FAQ says cash-on-delivery, but checkout never confirms it at the decision point.
- No order notes field, no shipping method choice, no "review order" step, no terms checkbox, no trust signals (secure payment, authenticity, returns).
- Submit shows `تأكيد الطلب — ٢٢٠ ج.م` (total, good) and is disabled while submitting (`isSubmitting`), so double-submit is prevented.
- **No rate limit on `/api/orders`** and no CSRF/origin check — a script can post unlimited orders (only Zod on the client; server validates presence, not shape or price).
- Error path is correct after the last fix: stays on the form, `role="alert"` message, cart preserved, button re-enabled.
- The `shipping` prop is passed from `page.tsx:15` and immediately discarded (`checkout-page.tsx:20` `_shipping` with an eslint-disable).

### 6.6 Success (`/checkout/success`)

- Correct now: green check medallion, **"تم استلام طلبكم بنجاح"**, **"وسيتم التواصل معكم على واتساب لتأكيد الطلب"**, order-number card with copy button, note block, "العودة للمتجر" button.
- Gaps: no WhatsApp deep-link to actually send the reference (text tells the customer to share), no delivery estimate, no itemised recap, no customer e-mail confirmation, and the order number is client-generated (see §8.5) so it is not a reliable reference.
- Copy button is 24×24; the note block restates the subtext almost verbatim.

### 6.7 FAQ / Policies / Contact / 404 / Error / Loading

- FAQ: 3 questions, `Accordion`, no search, no categories, no contact fallback at the end.
- Policies: 3 accordion bodies of 1–2 lines each (shipping 3–5 days, returns 7 days, COD). No dedicated policy pages → not linkable, not indexable, no SEO value.
- Contact: one WhatsApp `<a>` and one `mailto:` — no form, no phone, no address, no map, no hours. `data/contact.json` phone `201117569506` is a mobile only.
- 404: centred text + "العودة إلى الرئيسية", no search, no product suggestions, uses `text-accent`/`bg-accent`.
- `error.tsx`: `role="alert"`, retry button — fine, but copy is hardcoded (documented exception).
- `loading.tsx`: hand-rolled skeleton with **`lg:grid-cols-4`** (`loading.tsx:40`) while the real grid is `lg:grid-cols-3`, so the skeleton shows 8 items in 4 columns and snaps to 3 columns on hydration → guaranteed layout jump (CLS was 0 only because the route is server-rendered fast; on slow connections this mismatch is visible). The five `src/features/skeletons/*` components built for this are unused.

---

## 7. UX and Conversion Findings

### 7.1 Search

`searchProducts()` does a `toLowerCase().includes()` over 9 fields. No Arabic normalisation: hamza/alef variants, taa marbuta, diacritics and spacing are not folded. **Verified live**: typing `أفريكان` → **1 result**; typing `افريكان` (how Arabic users actually type) → **0 results**. Also: no ranking (a description hit ranks equal to a name hit), no typo tolerance, no suggestions, no recent searches, no "no results" recovery beyond a hint line, and search state is lost on navigation.

### 7.2 Filtering and sorting

- Sort lives inside the filter sidebar (desktop) and inside the same overlay (mobile) — a shopper looking for "السعر من الأقل" opens a panel titled "تصفية".
- `price-asc/desc` sorts on `sizes[0].price` (the 10ml price) — not a "from" price the customer can see on the card (the card shows the *selected* size price, defaulting to 10ml, so this is consistent only by accident).
- `best-selling` is the **default sort**, but with Redis unavailable locally it returns the raw catalog order (`sortOrder`); when Redis is live the order silently changes between visits.
- No result count anywhere ("٤٠ منتج" is never shown), no per-option counts, no multi-select affordance explanation, no clear-all in the grid header.

### 7.3 Product page conversion elements

Missing: reviews (0), social proof, stock scarcity, authenticity guarantee, concentration, notes pyramid, "how it smells" editorial copy, delivery date estimate, return policy inline, gift wrap, samples, bundles, recommendations, "ask about this perfume" (the AI chat could do it but is not surfaced contextually), size guidance, and brand identity.

### 7.4 Cart and checkout

- No free-shipping threshold (and the settings promise of free above 500 is unimplemented), no coupon, no bundle discount, no gift note, no delivery slot — four standard AOV levers absent.
- Shipping fee shown three different ways: card chip "مصاريف الشحن ١٠٠", drawer "مصاريف الشحن ١٠٠", summary "مصاريف الشحن ١٠٠" — consistent, but wrong vs. `settings.json` (60).
- Guest checkout ✅, 6 fields ✅ (3 required in the original spec, 6 now), inline errors ✅, retry-safe ✅, double-submit guard ✅.
- Payment method invisible, no order review step, no confirmation email to customer.

### 7.5 Trust and conversion

No reviews, no ratings, no customer photos, no order count, no "since 20xx", no authenticity statement beyond a FAQ line, no payment logos, no returns badge, no WhatsApp CTA on the product page (only in the contact section at the very bottom), no social proof from Instagram despite `data/social.json` existing and being unused in the UI.

### 7.6 Microcopy

- `طلبك` vs `طلبكم` inconsistency (success page fixed to طلبكم; FAQ/policies still informal).
- "**1 الكمية**" in the cart description.
- "**Close**" as the only English string in the UI (screen-reader label).
- Chinese sentence inside the Arabic AI system prompt: `src/app/api/chat/route.ts:27` — `始终保持 ردودك قصيرة (٢-٤ جمل كحد أقصى)`.
- `error.tsx` mixes "تواصل معنا عبر واتساب" with no link.
- Titles/labels use ellipses and exclamation marks inconsistently ("ابحث عن عطرك...").

### 7.7 Empty, error and loading states

Empty cart in drawer: emoji, no CTA. Empty checkout: icon + one link. No-results: good (`NoResults` with clear-filters action). Error: good (`role="alert"`, retry). Loading: skeleton exists but grid-column mismatch and unused dedicated components. No state for "product removed because it went out of stock while in cart" (cart trusts localStorage prices forever — a stale price will be submitted to the order API).

---

## 8. Technical Findings

### 8.1 Performance

Lighthouse 12, production build (`next start`):

| Run | Perf | A11y | Best Prac. | SEO | FCP | LCP | TBT | CLS | SI | Weight |
|---|---|---|---|---|---|---|---|---|---|---|
| Home — mobile | **81** | **87** | 100 | 100 | 1.2 s | **3.7 s** | 200 ms | 0 | 5.6 s | 605 KiB |
| Home — desktop | **94** | **84** | 100 | 100 | 0.3 s | 0.7 s | 0 ms | 0 | 2.4 s | 724 KiB |
| PDP — mobile | **93** | **89** | 100 | 100 | 1.2 s | **3.3 s** | 20 ms | 0 | 1.5 s | 370 KiB |

- Mobile LCP is a **lazy-loaded product `<img>`** (`lcp-lazy-loaded` fails on all three runs); `lcp-discovery-insight` and `image-delivery-insight` also fail.
- 40 cards render eagerly (DOM size audit fails); `unused-javascript` ≈ 46–52 KiB; `legacy-javascript` fails (no `browserslist`, Next polyfills shipped); `bf-cache` fails.
- Build artefacts: CSS 87.6 KB, total JS chunks 1.4 MB (largest single chunk 326 KB), 45 product images = **18.1 MB of 2000×2000 PNGs** (avg 421 KB, max 872 KB), plus 64 KB of unused hero WebPs.
- `quality={85}` unconfigured (38 console warnings/page); `fill` inside static parent (3 warnings/page).
- Homepage is dynamic (see §2.2) and blocks on a Redis call that fails loudly when unconfigured.
- Fonts: Cairo 300–800, `display: swap`, next/font self-hosted ✅ (6 weights preloaded — heavier than needed).

### 8.2 Accessibility (Lighthouse a11y 84–89; specific failures)

| Audit | Nodes | Evidence |
|---|---|---|
| `color-contrast` | 3 (mobile) / 6 (desktop/PDP) | §4.4 table — CTA 1.71:1, chip 1.62:1, badge 1.96:1, footer 2.43:1 |
| `link-name` | 1 | `<a class="flex items-center gap-3 shrink-0" href="/">` — the logo image has `alt=""` because `Header` is never given `storeName`/`logoAlt` (default `storeName = ""` at `header.tsx:63`) on **any** page |
| `label-content-name-mismatch` | 3–7 | Marquee frames `aria-label="هاشيفات"` contain visible "★ فاخر"; chat trigger aria-label contains the whole card sentence |
| `aria-hidden-focus` | 1 | `section.hero-mesh > … > div[aria-hidden="true"]` contains 12 focusable links |
| `aria-toggle-field-name` | **5** | `FilterGroup` passes `id="filter-{group}-{slug}"` to `<Checkbox>`, but base-ui renders `id="base-ui-_r_p_"`; the `<Label htmlFor>` points at a non-existent id → checkboxes have no accessible name |
| `heading-order` | 1–2 | No `<h1>` on `/`; filter group titles are `<h4>` under `<h2>`; footer `<h4>` after `<h2>` |
| `skip-link` | 1 (PDP) | `#main-content` missing on `/product/[slug]` |
| Touch targets | — | 24×24 (steppers, trash, copy), 28×28 (drawer close), 36px (drawer CTA), 32px (header icon) |
| Focus/keyboard | — | Mobile filter overlay has no dialog role, no focus trap, no Escape; 270–395 tab stops on `/` (24 in the marquee alone) |

Semantic basics that are correct: `lang="ar" dir="rtl"`, one `<main>` landmark, skip link on `/` and `/checkout`, `aria-pressed` on size pills, `aria-live="polite"` on toasts, `role="alert"` on form errors, `aria-invalid` on inputs, logical CSS properties throughout (`ms-`/`me-`, `start-`/`end-`).

### 8.3 Responsiveness

| Width | Observed |
|---|---|
| 360–375 | Single column; card 677px tall; chat card overlaps CTA; page 12,089px tall; no overflow-x ✅ |
| 768 | **Filters entirely absent** (toggle `md:hidden`, sidebar `hidden lg:block`); 2 columns |
| 1024 | Sidebar 256 + 3×213px cards — four size pills in 40–49px each; cramped but no overflow |
| 1440 | 3×304px; container 1280; looks correct but dense |
| 1920 | Untested interactively (no viewport available in this session). By construction `container` caps at 1536px, so the grid stays 3 columns and the page gains ~340px of empty margin per side — i.e. it does not scale up gracefully. |

### 8.4 SEO

- **Canonical is wrong on product pages.** `src/app/layout.tsx:71` sets `alternates.canonical = siteUrl` at the root; `generateMetadata` for products never overrides it → live PDP canonical = `https://parfumsdefoda.com/` (verified in the DOM). All 40 PDPs declare themselves duplicates of the homepage.
- **Titles double the brand**: `seo.title` in data already ends with "| Parfums De Foda" and the layout `title.template` appends "| Parfums De Foda" → live title `أفريكان ليذر | Parfums De Foda | Parfums De Foda` (all 40 products).
- **No Product structured data.** Only Organization, WebSite, Store are injected (`layout.tsx:80-160`). No `Product`, no `Offer`, no `AggregateRating`, no `BreadcrumbList` → no rich results.
- **OG image is an SVG** (`/logos/logo.svg`, declared 1200×630) — WhatsApp/Facebook/X do not render SVG OG images. `data/seo.json` points to `/logos/og-image.jpg`, which **does not exist**; `loadSeoConfig()` is never called.
- **`public/sitemap.xml` contains exactly one URL** (the homepage). No product pages, no `lastmod` for the catalogue, hand-maintained.
- `seo.description` empty for all 40 products → PDP description falls back to the product description (works, but no control).
- No `<h1>` on the homepage; no product review markup; no `hreflang` (single language, acceptable).
- URLs are SKU-like (`/product/pf020`) — no keyword, no brand.

### 8.5 Security and data integrity

| Issue | Evidence | Impact |
|---|---|---|
| **`GET /api/orders` returns all orders with PII** | `src/app/api/orders/route.ts:134-140` — no auth, no origin check | Anyone can enumerate customer names, phones, WhatsApp numbers, governorates, addresses |
| Orders stored in a module-level array | `route.ts:47` — `const orders: Order[] = []` | On Vercel every instance has its own memory and it is discarded after the invocation: **orders are effectively not persisted**; the only durable record is the email/WhatsApp notification |
| Order numbers generated client-side with a per-device counter | `src/lib/order-number.ts:31-45` (`localStorage`, resets daily, fallback random) | Every customer's first order of the day is `PDF-YYYYMMDD-00001` → collisions across customers; the reference is not authoritative |
| No rate limit on `/api/orders` | `checkRateLimit` is imported only by `/api/chat` (`route.ts:5`) | Unbounded order spam, email/WhatsApp notification flooding |
| Rate limiter is in-memory | `src/lib/rate-limiter.ts:12` `new Map()` | Per-instance on serverless → trivially bypassed |
| Client-supplied prices/totals trusted | `checkout-page.tsx:60-85` builds totals from localStorage cart; server only checks presence | A crafted POST can claim any price/total; also stale localStorage prices are submitted verbatim |
| No CSRF/origin validation on POST | `route.ts:51` | Cross-site order injection is possible |
| PII written to logs | `src/lib/logger.ts:60-75` logs name, phone, whatsapp, address | Customer PII retained in Vercel logs |
| Dependencies | `npm audit`: **2 critical** (direct `next` 16.2.10 in range `9.3.4-canary.0 – 16.3.7`), **19 high** (`shadcn`, `eslint-config-next`, `sharp`, `undici`, `postcss`, `braces`…), 7 moderate | Production exposure via the Next.js advisory |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy, Permissions-Policy (`next.config.ts:3-18`) | Good, but **no CSP**, and `X-XSS-Protection` is deprecated |
| Secrets | `.env*` untracked; `OPENAI_API_KEY` only read server-side | ✅ |
| Chat endpoint | No auth, in-memory rate limit, prompt injection partially mitigated by JSON contract + code validation (`product-grounding.ts`) | Cost/abuse exposure |

### 8.6 Code quality

- 10,503 LOC across `src/`; no `any`, no `as any`; strict mode; 5 targeted `eslint-disable` comments (all documented).
- Tests: 97 unit tests over helpers/services (currency, filters, sort, search, locale, validation, product grounding, AI provider, product service). **Zero component tests, zero E2E tests** — the entire UI layer (cards, cart, checkout, RTL) is untested; the checkout failure-path bug fixed last week had no regression test.
- Dead code: `src/hooks/use-checkout.ts` (never imported outside `hooks/index.ts`; contains a stale duplicate of the submit logic whose catch branch marks orders as submitted — a trap for the next developer), `src/features/skeletons/*` (5 components, 0 imports), `src/lib/storage.ts`, `src/lib/validation.ts`, `src/config/site.ts`, `src/services/cart.ts` + `services/orders.ts` (only re-exported), `data/hero.json`, `data/sizes.json` (validator-only), `loadSeoConfig()`, `useTheme()`.
- Duplication: cart line-item markup ×2, add-to-cart state machine ×2, `calculateTotal`/`getItemCount` duplicated by inline reducers in `CartProvider`, `USE_CART` in two storage-key constants (`constants.ts` `STORAGE_KEYS.CART` unused vs `CartProvider` local `STORAGE_KEY`).
- 7 `catch {}` blocks marked "silent fail" (localStorage/sessionStorage) — acceptable, but combined with the swallowed email/WhatsApp failures it means **order notifications can fail with no user-visible signal and no retry**.
- File organisation is genuinely good: feature folders with `components/hooks/types/utils` + barrels, server services isolated behind `src/types/services.ts`.
- Repo hygiene: 5 generated report `.md` files in the root, a 16,758-line `session-ses_09da.md`, `build.log`, `build-err.log`, `server.log`, `tsconfig.tsbuildinfo` in the working tree.
- Docs drift: `AGENTS.md` says 47 products (40), sizes `50/30/2.5 مللى` (actual `10/30/50/100 مل`), `Product.type` `"normal"|"niche"|"gold"` (actual `"شرقي"|"غربي"`), "all routes pre-rendered" (homepage is dynamic), "4 clicks" (holds), "grid 3/2/1" (holds).

### 8.7 Browser compatibility

No `browserslist` → Next ships legacy polyfills to all browsers (`legacy-javascript` audit fails). Uses `100dvh`, `backdrop-filter` (with `supports-` guard), `@base-ui/react` (modern browsers only), `IntersectionObserver`, `navigator.clipboard` (guarded). No IE support intended. No Safari/iOS-specific testing was possible here → **Unknown**; the risk areas are `100dvh` in the chat window, `background-clip: padding-box, border-box` on the featured card, and `toLocaleString("ar-EG")` numerals.

---

## 9. Apple-Standard Gap Scorecard

| Principle | Score | Justification (evidence) |
|---|---|---|
| Generous whitespace and breathing room | **3/10** | Sections at 32/48px, card padding 16px, 40 products in one 9,582px grid, desktop cards 304px with 2 CTAs; spacing tokens exist but are unused |
| Large, confident typography with hierarchy | **2/10** | 11 sizes, ceiling 24px, 141 nodes at 10px, 5 weights, no display scale, no fluid type |
| Restrained colour palette | **3/10** | Green + purple + gold + cream + lavender mesh in one viewport; 8 raw hexes bypass tokens; featured cards add a gold gradient border |
| High-quality product imagery with consistent treatment | **2/10** | 2000×2000 PNGs (18.1 MB) squeezed into 272px boxes; mixed transparent cut-outs and studio backgrounds; one shared placeholder image for 5 products; no hover/second image except 2/40 |
| Subtle, smooth, purposeful motion | **6/10** | Framer Motion used tastefully in places (price crossfade, drawer rows, success spring), but the marquee loops all 12 frames gold-framed, the chat card pulses/shimmers/attracts, and cards slide 4px + scale + shadow on hover |
| Clean, predictable navigation | **4/10** | Header works, but only 2 links, no shop/category entry, no mobile nav on PDP, filters absent on tablet, sort hidden inside filters, no search in header |
| Content clarity and short copy | **5/10** | Copy is short and Arabic-native, but there is almost no product storytelling, no notes, no reviews, and contradictory claims (shipping 100 vs 60; "فاخر" everywhere) |
| Consistency across the system | **3/10** | 12 radii, 12 shadows, 11 font sizes, 3 badge systems, 2 cart implementations, dead tokens, two i18n approaches (t() vs hardcoded) |
| Performance and perceived speed | **6/10** | Lighthouse 81–94, LCP 3.3–3.7s mobile on a lazy above-fold image, dynamic homepage with Redis blocking, 1.4 MB JS, no image budget |
| Attention to micro-details | **3/10** | 1.71:1 primary CTA, unreadable 10px labels, 24px touch targets, "1 الكمية", "Close" in English, breadcrumb chevron unflipped, skeleton with 4 columns vs 3, doubled `<title>` |

**Overall: ~3.7 / 10** — a competent e-commerce implementation that has not yet been designed. The gap is not primarily engineering; it is art direction, data enrichment, and restraint.

---

## 10. Prioritized Issues Table

| ID | Area | Issue | Evidence (file:line / measurement) | Severity | Effort |
|---|---|---|---|---|---|
| A1 | Commerce | Shipping charged 100 EGP while settings say 60; free-above-500 never applied | `src/config/constants.ts:30`; `data/settings.json`; `cart-drawer.tsx:224,231`; `checkout-page.tsx:39`; `product-card.tsx:394` | Critical | S |
| A2 | Security | `GET /api/orders` exposes all customer PII unauthenticated | `src/app/api/orders/route.ts:134-140` | Critical | S |
| A3 | Data | Orders are in-memory only; nothing persists across invocations | `route.ts:47` | Critical | L |
| A4 | SEO | PDP canonical points to homepage on all 40 products | `layout.tsx:71`; PDP `generateMetadata` sets no `alternates` | Critical | S |
| A5 | UX | Filters unreachable on 768–1023px | `filter-sidebar.tsx:43` (`hidden lg:block`), `header.tsx:208` (`md:hidden`) | Critical | S |
| A6 | Design | Primary CTA contrast 1.71:1; 5 more token-level contrast failures | `button.tsx` default variant; measured §4.4 | Critical | S |
| B1 | Design | Typography has no scale: 11 sizes, max 24px, 141 nodes at 10px | computed styles on `/` (§4.3) | High | M |
| B2 | Product card | Two stacked full-width CTAs + shipping chip + 4 size pills per card | `product-card.tsx:386-455` | High | M |
| B3 | Product card | Description block is dead code (never passed) | `home-page.tsx:85-100` omits `description`; `product-card.tsx:322-334` | High | S |
| B4 | Products | All 40 products lack notes, reviews, ratings, distinct brands | `data/products.json` (computed) | High | L |
| B5 | Images | 18.1 MB of 2000×2000 PNGs; no hover image; `quality=85` unconfigured; `fill` parent static | `public/products/`; `next.config.ts:22-29`; console warnings | High | M |
| B6 | Perf | Above-the-fold product images `loading="lazy"` → LCP 3.3–3.7 s mobile | `product-card.tsx:233,246`; Lighthouse `lcp-lazy-loaded` | High | S |
| B7 | Perf | Homepage is dynamic (Redis `no-store` blocks static rendering) | `next build` route table; `sales-tracking.ts`; `page.tsx:29` | High | M |
| B8 | A11y | 5 filter checkboxes have no accessible name (broken label association) | `filter-group.tsx:47-62`; DOM shows `id="base-ui-_r_p_"` | High | S |
| B9 | A11y | Marquee duplicate track is `aria-hidden` but contains 12 focusable links | `hero-showcase.tsx:156`; Lighthouse `aria-hidden-focus` | High | S |
| B10 | A11y | No `<h1>` on homepage; heading order broken | DOM `headings` (§6.1) | High | S |
| B11 | A11y | Skip link dead on PDP (`#main-content` missing) | `product-detail-page.tsx:110-114` | High | S |
| B12 | SEO | Product titles doubled (`… | Parfums De Foda | Parfums De Foda`) | `layout.tsx:52-55` + `data/products.json` `seo.title` | High | S |
| B13 | SEO | No Product/Offer/Breadcrumb structured data | `layout.tsx:80-160` | High | M |
| B14 | Conversion | Payment method never displayed on checkout | `checkout-page.tsx` (no render of `paymentMethod`) | High | S |
| B15 | Data | Badge field used for stock text → 5 cards show a gold "غير متوفر حالياً" badge | `data/products.json`; `product-card.tsx:255-275` | High | S |
| C1 | Security | No rate limit / origin check on `/api/orders` | `route.ts:51` | Medium | S |
| C2 | Security | Order numbers generated client-side → collisions | `src/lib/order-number.ts:31-45` | Medium | M |
| C3 | Security | 2 critical + 19 high npm advisories (Next direct) | `npm audit` | Medium | M |
| C4 | Perf | Skeleton grid 4 columns vs live 3 | `app/loading.tsx:40` vs `product-grid.tsx:39` | Medium | S |
| C5 | UX | Arabic search not normalised: `افريكان` → 0 results, `أفريكان` → 1 | `search-helpers.ts:26-46`; measured | Medium | S |
| C6 | UX | Mobile filter overlay without dialog role/focus trap/Escape/scroll lock | `filter-sidebar.tsx:50-95`; measured | Medium | M |
| C7 | UX | Touch targets 24–28px (steppers, trash, close, copy) | cart drawer DOM | Medium | S |
| C8 | UX | Cart drawer description reads "1 الكمية"; close label "Close" | `cart-drawer.tsx:100-102`; `sheet.tsx:88` | Medium | S |
| C9 | UX | Success page tells user to share order on WhatsApp but gives no link | `checkout/success/page.tsx:98-110` | Medium | S |
| C10 | UX | Header has no navigation on PDP mobile; only 2 links site-wide | `header.tsx:167-197`; `data/navigation.json` | Medium | M |
| C11 | IA | No catalogue/category/about/contact/policy routes | route table §3.1 | Medium | L |
| C12 | SEO | Sitemap has 1 URL; OG image is an SVG; `og-image.jpg` missing | `public/sitemap.xml`; `layout.tsx:55-60`; `data/seo.json` | Medium | S |
| C13 | Design | 12 radii, 12 arbitrary shadows, shadow/radius tokens unused | grep counts §4.6 | Medium | M |
| C14 | Design | Theme JSON only applies `colors`; typography/spacing/radius are inert | `ThemeProvider.tsx:31-38` | Medium | M |
| C15 | Content | Chinese instruction inside the Arabic AI prompt | `src/app/api/chat/route.ts:27` | Medium | S |
| C16 | Ops | No notification retry/telemetry on checkout; failures swallowed | `orders/route.ts:79-105` | Medium | M |
| C17 | Quality | 0 component/E2E tests; 5 dead modules; duplicate cart markup | §8.6 | Medium | M |
| C18 | Data | `نسائي` filter returns a single product | `data/products.json` | Medium | S |
| C19 | UX | 40 cards, no pagination/load-more; 12,089px mobile page | DOM measurements | Medium | M |
| C20 | A11y | 270–395 tab stops on `/` (24 in the marquee alone) | DOM count | Medium | S |
| D1 | Design | Section rhythm 32/48px; container caps at 1536 | `home-page.tsx:196,282`; `globals.css` | Low | S |
| D2 | Design | Gold gradient hardcoded 24× instead of a token | grep `#d4af37/#f5d060/#b8960c` | Low | S |
| D3 | SEO | Product URLs are SKUs (`/product/pf020`) | `data/products.json` slugs | Low | M |
| D4 | Ops | Root clutter: 5 reports, 16.7k-line session log, build logs | repo root | Low | S |
| D5 | Docs | `AGENTS.md` contradicts the schema (47 products, sizes, `type` enum) | `AGENTS.md` vs `product-schema.ts` | Low | S |
| D6 | Perf | 6 Cairo weights preloaded | `src/app/fonts.ts:8-15` | Low | S |

---

## 11. Quick Wins (high impact, low effort)

1. **Fix the shipping number and honour `freeAbove`** — delete `SHIPPING_FEE`, derive from `settings.shipping`, add "أضف X للشحن المجاني" to the drawer. One file plus a prop.
2. **Darken the primary CTA** to `--color-accent` (purple) or dark green text on green — removes the worst contrast failure site-wide.
3. **Fix the tablet filter gap**: change the toggle to `lg:hidden` so 768–1023px regains the drawer.
4. **Remove the second CTA from cards** (keep one) and delete the shipping chip — instant de-clutter of 40 cards.
5. **Pass `description` into cards** (or delete the dead block) — one line in `home-page.tsx`.
6. **Canonical + title fixes**: drop the root canonical, set per-product canonical, remove the duplicated brand from `seo.title` handling.
7. **Protect `GET /api/orders`** (delete it or gate it behind a secret header).
8. **Restore the `<h1>` on `/`** and rename section headings down one level.
9. **Make above-the-fold card images eager** (`priority` for the first 3) — direct LCP win.
10. **Arabic search normalisation** (strip tatweel/diacritics, fold أإآ→ا, ة→ه, ى→ي) — turns 0 results into 1+.
11. **Add `autocomplete` + `inputMode` to checkout inputs** — fewer form abandonments on mobile.
12. **Generate the sitemap from `products.json`** and add `alternates.canonical` per product.
13. **Replace the 5 placeholders**: `data/products.json` badge values and the shared unavailable image.
14. **Set `images.qualities: [75, 85]`** and `position: relative` on the image wrapper — removes 41 console warnings/page.

---

## 12. Risks and Things To Be Careful About When Redesigning

1. **The JSON schema is the contract.** `src/schemas/product-schema.ts` is the single source of truth; adding `concentration`, `ml`, `compareAtPrice` or `reviewCount` means updating schema + JSON + `validate-json` in one change, or the build breaks.
2. **Client/server boundary is fragile.** Any `import type` from `src/services/*` into a `"use client"` file pulls `node:fs` into the bundle and breaks Turbopack. Keep new types in `src/types/services.ts` or a zod-pure schema module.
3. **Cart identity is `productId + sizeLabel`.** Changing size labels to numeric ml (or renaming "10 مل") silently invalidates every cart already in localStorage — plan a migration or accept cart loss.
4. **`CartProvider` hydration contract**: initial `[]`, hydrate in `useEffect`, persist on change with a first-render skip. Any "improvement" that reads localStorage during render reintroduces hydration mismatches.
5. **Lint forbids `setState` inside `useEffect`** (`react-hooks/set-state-in-effect`) — the codebase uses render-time state adjustment (see `chat-widget.tsx:78-82`). Follow that pattern or lint fails.
6. **`ChatAssistant` must stay inside `<Providers>`** and its unmount-on-drawer/checkout rule exists because the floating card covers the checkout button. Removing the rule reintroduces a blocking overlay.
7. **The checkout success path is load-bearing**: navigate only after `response.ok`, clear cart only on success, keep the cart on failure. A regression here shows "order received" for orders that were never created.
8. **Base-UI, not Radix.** `Button` uses a `render` prop (`<Button render={<Link/>}>`); wrapping `<Button>` in `<a>` breaks semantics. `Checkbox`'s id does not reach the DOM node (the current a11y bug) — verify label association after any Shadcn update.
9. **RTL everywhere**: use logical properties; the marquee needs `dir="ltr"` on both the overflow container and the track (the seam bug is documented in `hero-showcase.tsx:120-140`) — do not "clean that up".
10. **Images are 2000×2000 PNGs.** Resizing/re-encoding 40 files is the single largest perceptual win, but it changes `public/products/*` and therefore every `products.json.image` reference if names change. Re-encode in place, keep filenames.
11. **The homepage is dynamic because of Redis.** Making it static requires deciding whether best-selling data may be stale (ISR) or whether the Redis call moves to the client — a product decision, not a code tweak.
12. **Orders do not persist.** Any redesign that promises "order tracking" or "order history" is blocked until a real store (DB or at minimum an external record) exists.
13. **Do not add features that need data the catalog does not have** (reviews, notes pyramids, "same scent family") without first populating 40 products — otherwise the UI ships empty sections exactly like today's `ملاحظات العطر`.
14. **Arabic-Indic numerals** come from `formatPrice`; mixing Latin digits (order numbers) with Arabic-Indic prices is intentional but must stay consistent.
15. **`error.tsx` / `not-found.tsx` render outside the provider tree** — they cannot use `t()`; hardcoded Arabic there is deliberate.

---

## 13. Open Questions for the Owner

1. **Shipping**: is the real fee 60 EGP (settings) or 100 EGP (hardcoded)? Is free shipping above 500 EGP still a real promise?
2. **Order storage**: where do orders actually live today? Only in the owner's WhatsApp/e-mail? Is a database approved for the redesign?
3. **Catalogue truth**: are the 40 products dupes/inspired-by or original? Which brands are licensed to be named? Why is `brand` always "Parfums De Foda" while descriptions cite Memo Paris / Tom Ford / Armani?
4. **Sizes**: the schema allows 4 (10/30/50/100 مل) but `AGENTS.md` mentions 2.5/30/50 — which is the real assortment? Are 10ml decants a core offer or a test?
5. **Customers**: are the 5 out-of-stock items permanently out? Should they be hidden (`status`) instead of shown with a placeholder image?
6. **Reviews**: is there any review source (Instagram, WhatsApp testimonials) that can seed real ratings? Otherwise ratings must be removed, not faked.
7. **Photography**: is there a budget for consistent product photography (single seamless background, one lighting setup, 3 angles + macro)? Everything else in a premium redesign depends on this.
8. **Brand assets**: is the current logo (green diamond + gold script) final? Any brand guidelines, Arabic typeface preference, or a designer to work with?
9. **Legal/trust**: VAT registration, return policy authority, authenticity guarantee wording — who signs these off? They are needed for trust badges and policy pages.
10. **Platform**: stay on Vercel + JSON (owner-editable files) or move to a headless commerce backend (needed the moment order persistence, stock, or admin is required)?
11. **Scale**: is the catalogue going to stay ~40 SKUs, or grow to hundreds? (It changes pagination, search and image strategy.)
12. **Languages/currency**: Arabic + EGP only forever, or GCC expansion (AED/SAR, English)?

---

## Appendix A — Full Folder Tree

```
parfumsdefoda/
  .env
  .env.development.local
  .env.example
  .env.local
  .github
  .github/workflows
  .github/workflows/ci.yml
  .gitignore
  .mimocode
  .mimocode/.cron-lock
  .mimocode/.gitignore
  .prettierrc
  .vercel
  .vercel/README.txt
  .vercel/repo.json
  AGENTS.md
  FINAL_RELEASE_REPORT.md
  PROJECT_FINAL_AUDIT.md
  PROJECT_OPTIMIZATION_REPORT.md
  README-AR.md
  README.md
  Ref
  Ref/Des-ref.jpg
  Ref/Logo.rar
  Ref/Logo.svg
  Ref/Ref.jpeg
  Ref/perfume_website.html
  SITE_AUDIT_REPORT.md
  build-err.log
  build.log
  components.json
  content
  content/about.json
  content/faq.json
  content/hero.json
  content/homepage.json
  content/policies.json
  data
  data/badges.json
  data/categories.json
  data/contact.json
  data/egypt-governorates.json
  data/filters.json
  data/footer.json
  data/navigation.json
  data/products.json
  data/seo.json
  data/settings.json
  data/sizes.json
  data/social.json
  data/theme.json
  docs
  docs/Architecture.md
  docs/Deployment-Hostinger.md
  docs/Design-System.md
  docs/Folder-Guide.md
  docs/Future-Roadmap.md
  docs/JSON-Guide.md
  docs/JSON-Schema.md
  docs/compose
  docs/compose/plans
  docs/compose/plans/2026-07-21-project-cleanup-and-tests.md
  eslint.config.mjs
  locales
  locales/ar.json
  next-env.d.ts
  next.config.ts
  package-lock.json
  package.json
  postcss.config.mjs
  public
  public/favicon.svg
  public/images
  public/images/hero-desktop.webp
  public/images/hero-mobile.webp
  public/images/هيدر الويبسايت.webp
  public/logos
  public/logos/logo.svg
  public/products
  public/products/PF020.png
  public/products/PF040.png
  public/products/PF070.png
  public/products/PF080.png
  public/products/PF090.png
  public/products/PF091.png
  public/products/PF100.png
  public/products/PF110.png
  public/products/PF130.png
  public/products/PF140.png
  public/products/PF150.png
  public/products/PF170.png
  public/products/PF180.png
  public/products/PF230.png
  public/products/PF231.png
  public/products/PF240.png
  public/products/PF260.png
  public/products/PF280.png
  public/products/PF290.png
  public/products/PF310.png
  public/products/PF320.png
  public/products/PF330.png
  public/products/PF350.png
  public/products/PF370.png
  public/products/PF380.png
  public/products/PF390.png
  public/products/PF410.png
  public/products/PF430.png
  public/products/PF450.png
  public/products/PF480.png
  public/products/PF490.png
  public/products/PF500.png
  public/products/PF510.png
  public/products/PF520.png
  public/products/PF530.png
  public/products/PF550.png
  public/products/PF630.png
  public/products/PF650.png
  public/products/PF660.png
  public/products/PF670.png
  public/products/PF680.png
  public/products/PF690.png
  public/products/PF700.png
  public/products/PF710.png
  public/products/placeholder-unavailable.webp
  public/robots.txt
  public/sitemap.xml
  scripts
  scripts/inspect-deploy.mjs
  scripts/list-deploys.mjs
  scripts/test-live-chat.mjs
  scripts/validate-json.js
  server.log
  session-ses_09da.md
  src
  src/app
  src/app/api
  src/app/api/chat
  src/app/api/orders
  src/app/checkout
  src/app/checkout/page.tsx
  src/app/checkout/success
  src/app/error.tsx
  src/app/fonts.ts
  src/app/globals.css
  src/app/layout.tsx
  src/app/loading.tsx
  src/app/not-found.tsx
  src/app/page.tsx
  src/app/product
  src/app/product/[slug]
  src/app/providers.tsx
  src/components
  src/components/ui
  src/components/ui/accordion.tsx
  src/components/ui/badge.tsx
  src/components/ui/button.tsx
  src/components/ui/checkbox.tsx
  src/components/ui/dialog.tsx
  src/components/ui/input.tsx
  src/components/ui/label.tsx
  src/components/ui/separator.tsx
  src/components/ui/sheet.tsx
  src/components/ui/skeleton.tsx
  src/config
  src/config/constants.ts
  src/config/fonts.ts
  src/config/site.ts
  src/features
  src/features/cart
  src/features/cart/components
  src/features/cart/hooks
  src/features/cart/index.ts
  src/features/cart/types
  src/features/chat-assistant
  src/features/chat-assistant/components
  src/features/chat-assistant/hooks
  src/features/chat-assistant/index.ts
  src/features/chat-assistant/types.ts
  src/features/checkout
  src/features/checkout/components
  src/features/checkout/index.ts
  src/features/checkout/schema
  src/features/checkout/types
  src/features/empty-states
  src/features/empty-states/components
  src/features/empty-states/index.ts
  src/features/faq
  src/features/faq/components
  src/features/faq/index.ts
  src/features/filters
  src/features/filters/components
  src/features/filters/hooks
  src/features/filters/index.ts
  src/features/filters/types
  src/features/home
  src/features/home/components
  src/features/home/index.ts
  src/features/layout
  src/features/layout/components
  src/features/layout/index.ts
  src/features/policies
  src/features/policies/components
  src/features/policies/index.ts
  src/features/products
  src/features/products/components
  src/features/products/hooks
  src/features/products/index.ts
  src/features/products/types
  src/features/products/utils
  src/features/search
  src/features/search/components
  src/features/search/index.ts
  src/features/shared
  src/features/shared/components
  src/features/shared/hooks
  src/features/skeletons
  src/features/skeletons/components
  src/features/skeletons/index.ts
  src/features/toast
  src/features/toast/components
  src/features/toast/index.ts
  src/hooks
  src/hooks/index.ts
  src/hooks/use-checkout.ts
  src/hooks/use-content.ts
  src/hooks/use-filters.ts
  src/hooks/use-localization.ts
  src/hooks/use-products.ts
  src/hooks/use-seo.ts
  src/hooks/use-settings.ts
  src/lib
  src/lib/ai-provider.test.ts
  src/lib/ai-provider.ts
  src/lib/currency.test.ts
  src/lib/currency.ts
  src/lib/email.ts
  src/lib/filter-helpers.test.ts
  src/lib/filter-helpers.ts
  src/lib/hero-selection.test.ts
  src/lib/hero-selection.ts
  src/lib/json-loader.ts
  src/lib/locale.test.ts
  src/lib/locale.ts
  src/lib/logger.ts
  src/lib/order-number.ts
  src/lib/product-grounding.test.ts
  src/lib/product-grounding.ts
  src/lib/product-helpers.test.ts
  src/lib/product-helpers.ts
  src/lib/rate-limiter.ts
  src/lib/redis.ts
  src/lib/sales-tracking.ts
  src/lib/search-helpers.test.ts
  src/lib/search-helpers.ts
  src/lib/sort-helpers.test.ts
  src/lib/sort-helpers.ts
  src/lib/storage.ts
  src/lib/utils.ts
  src/lib/validation.test.ts
  src/lib/validation.ts
  src/lib/whatsapp.ts
  src/providers
  src/providers/CartProvider.tsx
  src/providers/ThemeProvider.tsx
  src/schemas
  src/schemas/checkout.ts
  src/schemas/product-schema.ts
  src/services
  src/services/cart.ts
  src/services/content.ts
  src/services/filters.ts
  src/services/localization.ts
  src/services/orders.ts
  src/services/products.test.ts
  src/services/products.ts
  src/services/seo.ts
  src/services/settings.ts
  src/services/theme.ts
  src/types
  src/types/cart.ts
  src/types/filter.ts
  src/types/index.ts
  src/types/order.ts
  src/types/product.ts
  src/types/seo.ts
  src/types/services.ts
  src/types/settings.ts
  tsconfig.json
  tsconfig.tsbuildinfo
  update_github.bat
  vitest.config.ts
```

## Appendix B — Key Files That Matter Most for the Redesign

| Priority | File | Why |
|---|---|---|
| 1 | `src/features/products/components/product-card.tsx` | The unit of commerce; every visual and conversion decision lands here |
| 2 | `src/app/globals.css` | All design tokens (and where the type scale must be defined) |
| 3 | `data/theme.json` | Owner-editable palette; only `colors` currently takes effect |
| 4 | `src/features/home/components/home-page.tsx` | Composes the whole storefront: hero, search, filters, grid, FAQ, policies, contact |
| 5 | `src/features/products/components/product-detail-page.tsx` | 511 lines; the page that must carry the brand story and trust |
| 6 | `src/features/cart/components/cart-drawer.tsx` | Cart + shipping/total logic (hardcoded fee lives here) |
| 7 | `src/features/checkout/components/checkout-page.tsx` | Submit flow, totals, success/error routing |
| 8 | `src/features/checkout/components/checkout-form.tsx` | 311 lines of form UI/labels; a11y and autocomplete live here |
| 9 | `src/app/layout.tsx` | Metadata, canonical (bug), OG, JSON-LD, providers, skip link |
| 10 | `src/schemas/product-schema.ts` | The catalogue contract; blocks any richer product page |
| 11 | `data/products.json` | The content itself: 40 products, no notes/reviews/brands |
| 12 | `src/features/layout/components/header.tsx` | Navigation (2 links), scroll behaviour, logo sizing |
| 13 | `src/features/filters/components/filter-sidebar.tsx` | The tablet filter gap and the non-modal mobile overlay |
| 14 | `src/components/ui/button.tsx` | Primary CTA colour/contrast/radius, overridden everywhere |
| 15 | `next.config.ts` | Image budget (`qualities`, sizes), security headers, runtime JSON tracing |

## Appendix C — Full Source of the Product Card

File: `src/features/products/components/product-card.tsx` (468 lines, verbatim)

```tsx
"use client";

import { useState, useCallback, useRef, memo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FeaturedBadge } from "./featured-badge";
import { formatPrice } from "@/lib/currency";
import { SHIPPING_FEE } from "@/config/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductSize {
  label: string;
  price: number;
  inStock: boolean;
}

export interface ProductCardProduct {
  id: string;
  slug?: string;
  name: string;
  brand: string;
  image: string;
  type: "شرقي" | "غربي";
  /** Optional short description — shown below product name */
  description?: string;
  badge?: string;
  rating?: number;
  sizes: ProductSize[];
  /** Fragrance notes pyramid */
  notes?: { top?: string[]; middle?: string[]; base?: string[] };
  /** Gender classification */
  gender?: "رجالي" | "نسائي" | "للجنسين";
  /** House (الدار): ديزاينر / نيش / دووب */
  house?: string;
  /** Featured product flag — triggers gold premium card style */
  featured?: boolean;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  /** Grid column count — drives image responsive sizes */
  columns?: 1 | 2 | 3 | 4;
  /** Label for "add to cart" button */
  addToCartLabel?: string;
  /** Label shown briefly after adding */
  addedLabel?: string;
  /** Label for out-of-stock state */
  outOfStockLabel?: string;
  /** Label prefix for size selector */
  selectSizeLabel?: string;
  /** Label shown below price */
  taxIncludedLabel?: string;
  /** Label for the "Buy Now" shortcut button */
  buyNowLabel?: string;
  /** Called when user clicks "add to cart" */
  onAddToCart?: (product: ProductCardProduct, size: ProductSize) => void;
  /** Called when user clicks "Buy Now" — navigate straight to checkout */
  onBuyNow?: () => void;
  className?: string;
}

// ─── Badge helpers ──────────────────────────────────────────────────────────

/** Maps raw badge strings to Arabic display labels */
function resolveBadgeLabel(badge: string): string {
  const lower = badge.toLowerCase();
  if (lower === "new" || lower === "جديد") return "جديد";
  if (lower === "bestseller" || lower === "best seller" || lower === "الأكثر مبيعاً")
    return "الأكثر مبيعاً";
  if (lower === "niche" || lower === "نيش") return "نيش";
  if (lower === "limited" || lower === "إصدار محدود") return "إصدار محدود";
  return badge;
}

// ─── Image sizes by column count ────────────────────────────────────────────

function getImageSizes(columns: number): string {
  switch (columns) {
    case 1:
      return "(max-width: 640px) 100vw";
    case 2:
      return "(max-width: 640px) 100vw, 50vw";
    case 3:
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
    default:
      return "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";
  }
}

// ─── Button state type ──────────────────────────────────────────────────────

type ButtonState = "idle" | "loading" | "success";

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductCard — premium luxury perfume product display.
 *
 * Landscape layout with image on right, content on left (RTL).
 * Features: category badge, product name, short description,
 * size selector pills, price, and add-to-cart button.
 *
 * Pure presentational — all data and callbacks via props.
 * Memoized to prevent unnecessary re-renders in grid.
 */
export const ProductCard = memo(function ProductCard({
  product,
  columns = 3,
  addToCartLabel = "أضف إلى السلة",
  addedLabel = "✓ تمت الإضافة",
  outOfStockLabel = "غير متوفر",
  selectSizeLabel = "اختر الحجم",
  taxIncludedLabel = "شامل الضريبة",
  buyNowLabel = "اشتر الآن",
  onAddToCart,
  onBuyNow,
  className,
}: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(
    product.sizes[0] ?? null,
  );
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const timersRef = useRef<{ loading?: ReturnType<typeof setTimeout>; success?: ReturnType<typeof setTimeout> }>({});
  const cardRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isOutOfStock =
    selectedSize !== null && !selectedSize.inStock;

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "50px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedSize || isOutOfStock || buttonState !== "idle") return;

    setButtonState("loading");
    onAddToCart?.(product, selectedSize);

    // Brief loading pulse then success
    timersRef.current.loading = setTimeout(() => {
      setButtonState("success");
      timersRef.current.success = setTimeout(() => {
        setButtonState("idle");
      }, 1500);
    }, 350);
  }, [selectedSize, isOutOfStock, buttonState, onAddToCart, product]);

  const badgeLabel = product.badge ? resolveBadgeLabel(product.badge) : null;

  // Truncate description to 2 lines
  const shortDescription = product.description
    ? product.description.length > 120
      ? product.description.slice(0, 120).trim() + "..."
      : product.description
    : null;

  const detailHref = product.slug ? `/product/${product.slug}` : null;

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "transition-all duration-500 ease-out",
        "bg-[var(--bg-primary)]",
        "border",
        product.featured
          ? "border-transparent shadow-[0_2px_24px_rgba(212,175,55,0.12)] hover:shadow-[0_16px_48px_rgba(212,175,55,0.3)]"
          : "border-[var(--neutral-100)] shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]",
        product.featured
          ? "hover:-translate-y-1.5 hover:scale-[1.01]"
          : "hover:-translate-y-1",
        // Fade-in animation
        "transition-opacity transition-transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      )}
      style={{
        transitionDuration: "500ms",
        ...(product.featured
          ? {
              backgroundImage:
                "linear-gradient(var(--bg-primary), var(--bg-primary)), linear-gradient(135deg, #b8960c, #d4af37, #f5d060, #d4af37, #b8960c)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }
          : undefined),
      }}
    >
      {/* ─── Image ─── */}
      <div className={cn(
        "relative overflow-hidden",
        product.featured
          ? "bg-gradient-to-b from-[#fdf8e8] to-[var(--bg-primary)]"
          : "bg-[var(--bg-primary)]",
      )}>
        {detailHref ? (
          <Link
            href={detailHref}
            className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            aria-label={product.name}
            tabIndex={-1}
          >
            <div className="aspect-square w-full">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes={getImageSizes(columns)}
                className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                quality={85}
                loading="lazy"
              />
            </div>
          </Link>
        ) : (
          <div className="aspect-square w-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes={getImageSizes(columns)}
              className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              quality={85}
              loading="lazy"
            />
          </div>
        )}

        {/* Badge — top corner */}
        {badgeLabel && (
          <div className="absolute top-3 end-3 z-10">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none tracking-wide",
                badgeLabel === "الأكثر مبيعاً"
                  ? "bg-[var(--color-secondary)] text-white"
                  : badgeLabel === "نيش"
                    ? "border border-[var(--color-accent)]/30 bg-[var(--bg-primary)]/90 text-[var(--color-accent)]"
                    : "bg-[var(--color-gold)] text-white",
              )}
            >
              {badgeLabel}
            </span>
          </div>
        )}

        {/* Featured ribbon — top left */}
        {product.featured && (
          <>
            <div className="absolute top-3 start-3 z-10">
              <FeaturedBadge size="sm" />
            </div>
            {/* Gold shimmer overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f5d060]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-[5]" />
          </>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* House Badge (الدار) */}
        {product.house && (
          <div>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
              product.featured
                ? "bg-[var(--color-gold)]/15 text-[#b8960c]"
                : "bg-[var(--color-gold)]/10 text-[var(--color-gold)]",
            )}>
              {product.house}
            </span>
          </div>
        )}

        {/* Product Name */}
        {detailHref ? (
          <Link
            href={detailHref}
            className={cn(
              "text-lg leading-snug line-clamp-1 hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded",
              product.featured
                ? "font-extrabold tracking-wide text-[var(--neutral-900)]"
                : "font-bold text-[var(--neutral-800)]",
            )}
          >
            {product.name}
          </Link>
        ) : (
          <h3 className={cn(
            "text-lg leading-snug line-clamp-1",
            product.featured
              ? "font-extrabold tracking-wide text-[var(--neutral-900)]"
              : "font-bold text-[var(--neutral-800)]",
          )}>
            {product.name}
          </h3>
        )}

        {/* Short Description */}
        {shortDescription && (
          <div>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-[var(--neutral-300)]">
              وصف المنتج
            </span>
            <p className="text-[13px] leading-relaxed text-[var(--neutral-400)] line-clamp-2">
              {shortDescription}
            </p>
          </div>
        )}

        {/* Size Selector — rounded pills, single row */}
        {product.sizes.length > 0 && (
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-[var(--neutral-300)]">
              {selectSizeLabel}
            </span>
            <div className="flex gap-1.5">
              {product.sizes.map((size) => {
                const isSelected = selectedSize?.label === size.label;
                const sizeOutOfStock = !size.inStock;
                return (
                  <button
                    key={size.label}
                    type="button"
                    disabled={sizeOutOfStock}
                    onClick={() => setSelectedSize(size)}
                    aria-label={`${size.label} — ${formatPrice(size.price)}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex-1 rounded-full py-2 px-1 text-[12px] font-medium whitespace-nowrap",
                      "transition-all duration-300 ease-out",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                      isSelected
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "bg-[var(--bg-secondary)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--color-gold)] hover:text-[var(--neutral-800)]",
                      sizeOutOfStock && "opacity-35 cursor-not-allowed",
                    )}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price */}
        {selectedSize && (
          <div className="mt-auto pt-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={selectedSize.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-block text-2xl font-bold tracking-tight text-[var(--color-accent)] leading-none"
              >
                {formatPrice(selectedSize.price)}
              </motion.span>
            </AnimatePresence>
            <p className="mt-0.5 text-[10px] text-[var(--neutral-400)]">
              {taxIncludedLabel}
            </p>
          </div>
        )}

        {/* Shipping Fee Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-secondary)]/10 px-2.5 py-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]" />
          <span className="text-[11px] font-medium text-[var(--color-secondary)]">
            مصاريف الشحن {formatPrice(SHIPPING_FEE)} فقط
          </span>
        </div>

        {/* Buy Now + Add to Cart buttons */}
        <div className="flex flex-col gap-2">
          {/* Buy Now — navigate straight to checkout after adding */}
          {!isOutOfStock && selectedSize && (
            <Button
              type="button"
              onClick={() => {
                // 1. Add the selected variant to cart (merge, don't replace)
                onAddToCart?.(product, selectedSize);
                // 2. Immediately navigate to checkout (full cart, including other items)
                onBuyNow?.();
              }}
              disabled={buttonState !== "idle"}
              variant="secondary"
              className={cn(
                "rounded-full text-sm font-semibold",
                "bg-[var(--color-gold)] text-[var(--neutral-900)]",
                "hover:bg-[var(--color-gold)]/90 hover:text-[var(--neutral-800)]",
                "transition-all duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-gold)]",
                buttonState === "success" && "!bg-[var(--color-success)] !text-white",
              )}
              aria-label={buyNowLabel}
            >
              {buyNowLabel}
            </Button>
          )}

          {/* Add to Cart — standard green button */}
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock || !selectedSize || buttonState !== "idle"}
            variant="default"
            className={cn(
              "h-10 w-full rounded-full text-[13px] font-semibold",
              "bg-[var(--color-secondary)] text-white",
              "hover:bg-[var(--color-accent)] hover:text-white",
              "transition-all duration-300",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              buttonState === "success" &&
                "!bg-[var(--color-success)] !text-white hover:!bg-[var(--color-success)]",
            )}
            aria-label={
              isOutOfStock
                ? outOfStockLabel
                : buttonState === "success"
                  ? addedLabel
                  : addToCartLabel
            }
          >
            {isOutOfStock ? (
              outOfStockLabel
            ) : buttonState === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{addToCartLabel}</span>
              </span>
            ) : buttonState === "success" ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{addedLabel}</span>
              </span>
            ) : (
              addToCartLabel
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
```

## Appendix D — Exact Design Tokens / Theme / Tailwind Config

### D.1 There is no `tailwind.config.js`

Tailwind v4 is configured CSS-first. The only build config is:

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Design tokens are declared in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

/* ──────────────────────────────────────────
   Design Tokens — Injected from data/theme.json at build time
   These defaults match the brand palette and are overridden
   by the ThemeProvider which reads theme.json.
   ────────────────────────────────────────── */

:root {
  /* Brand Colors */
  --color-primary: #ffffff;
  --color-secondary: #9cd676;
  --color-accent: #632989;
  --color-gold: #d4af37;

  /* Neutral Palette */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;

  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Background Variations */
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --bg-elevated: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Border Colors */
  --border-default: #e5e7eb;
  --border-light: #f3f4f6;
  --border-focus: #632989;
  --border-error: #ef4444;
  --border-gold: #d4af37;

  /* Spacing */
  --spacing-section: 5rem;
  --spacing-card-gap: 1.5rem;
  --spacing-container-padding: 1.5rem;

  /* Border Radius */
  --radius-card: 0.75rem;
  --radius-button: 0.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 2px 16px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 8px 30px rgba(0, 0, 0, 0.1);
  --shadow-drawer: -4px 0 24px rgba(0, 0, 0, 0.1);

  /* Animations */
  --animation-default: 0.3s ease;
  --animation-slow: 0.5s ease;
  --animation-fast: 0.15s ease;
}

@theme inline {
  --color-background: var(--bg-primary);
  --color-foreground: var(--neutral-900);
  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--neutral-900);
  --color-secondary: var(--color-secondary);
  --color-secondary-foreground: #ffffff;
  --color-accent: var(--color-accent);
  --color-accent-foreground: #ffffff;
  --color-gold: var(--color-gold);
  --color-gold-foreground: #ffffff;
  --color-muted: var(--neutral-100);
  --color-muted-foreground: var(--neutral-500);
  --color-destructive: var(--color-error);
  --color-destructive-foreground: #ffffff;
  --color-border: var(--border-default);
  --color-input: var(--border-default);
  --color-ring: var(--color-accent);
}

/* ──────────────────────────────────────────
   Base Styles
   ────────────────────────────────────────── */

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg-primary);
  color: var(--neutral-800);
  font-family: var(--font-cairo), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* RTL-specific overrides for Shadcn/UI components */
[data-slot="sheet-content"][data-side="right"] {
  right: 0;
  left: auto;
}

/* Skeleton animation */
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* Premium card shimmer animation for featured products */
@keyframes premium-shimmer {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}

.group:hover .premium-shimmer {
  animation: premium-shimmer 3s ease-in-out infinite;
}

/* Chat widget — gold glow pulse animation */
@keyframes chat-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4),
                0 4px 16px rgba(99, 41, 137, 0.3);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(212, 175, 55, 0),
                0 4px 24px rgba(99, 41, 137, 0.5);
  }
}

/* Chat widget — first-visit attention pulse (card scale heartbeat) */
@keyframes chat-attract {
  0%, 100% {
    transform: scale(1);
  }
  10% {
    transform: scale(1.06);
  }
  20% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.05);
  }
  45% {
    transform: scale(1);
  }
}

/* Chat widget — shimmer sweep across the trigger card */
@keyframes chat-sweep {
  0% {
    transform: translateX(-150%) rotate(12deg);
  }
  55%, 100% {
    transform: translateX(350%) rotate(12deg);
  }
}

/* Hero showcase — infinite product marquee (seamless via duplicated track) */
@keyframes marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.marquee-track {
  animation: marquee-scroll 45s linear infinite;
  will-change: transform;
}

/* Pause the marquee while hovering it */
.marquee:hover .marquee-track {
  animation-play-state: paused;
}

/* Hero showcase — slow-moving warm gradient mesh behind the band */
@keyframes hero-mesh {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero-mesh {
  background: linear-gradient(
    120deg,
    #fdf8e8 0%,
    #faf3e0 30%,
    #f6ecfa 60%,
    #fdf8e8 100%
  );
  background-size: 200% 200%;
  animation: hero-mesh 14s ease-in-out infinite;
}

/* Respect reduced-motion: disable marquee, mesh, shimmer sweeps */
@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
  }
  .hero-mesh {
    animation: none;
  }
}


```

### D.2 `data/theme.json` (owner-editable, only `colors` are applied at runtime)

```json
{
  "colors": {
    "primary": "#FFFFFF",
    "secondary": "#9CD676",
    "accent": "#632989",
    "gold": "#D4AF37"
  },
  "typography": {
    "fontFamily": "Cairo",
    "headingWeight": "700",
    "bodyWeight": "400",
    "baseSize": "1rem",
    "scaleRatio": "1.25"
  },
  "spacing": {
    "section": "5rem",
    "cardGap": "1.5rem",
    "containerPadding": "1.5rem"
  },
  "radius": {
    "card": "0.75rem",
    "button": "0.5rem",
    "full": "9999px"
  },
  "shadows": {
    "card": "0 2px 16px rgba(0,0,0,0.06)",
    "cardHover": "0 8px 30px rgba(0,0,0,0.1)",
    "drawer": "-4px 0 24px rgba(0,0,0,0.1)"
  },
  "animations": {
    "default": "0.3s ease",
    "slow": "0.5s ease",
    "fast": "0.15s ease"
  }
}
```

### D.3 Runtime injection (colours only)

```tsx
 *
 * Theme data is loaded server-side by layout.tsx and passed as a prop.
 * This component only handles DOM injection (which requires client access).
 */
export function ThemeProvider({ children, initialTheme = null }: ThemeProviderProps) {
  useEffect(() => {
    // Inject theme colors as CSS custom properties
    if (initialTheme?.colors) {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(initialTheme.colors)) {
        root.style.setProperty(`--color-${key}`, value);
      }
    }
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{ theme: initialTheme, isLoading: false }}>
      {children}
```

## Appendix E — Screen-by-Screen Descriptions (as observed)

Screens were captured and inspected live in Chromium against the production build: homepage and PDP at 1440×900, 1024×768, 768×1024 and 375×812; cart drawer, checkout and success at 375×812. Image files were not written into the repository (analysis-only rule), so this appendix records what each screen actually rendered.

### E.1 Homepage — 1440×900

- 97px white header: 80px logo far right, two text links (الرئيسية · اتصل بنا) around the centre, cart icon far left. No search, no categories, no shop link.
- Full-bleed 274px hero band with a cream→lavender animated mesh, centred H2 'اكتشف تشكيلتنا الفاخرة' with a 64×4px gold underline, then a horizontally scrolling strip of 12 perfume frames — 8 of them outlined in gold with a '★ فاخر' pill in the corner, each ~224px square with a 16px inset photo.
- 32px gap, then a lone pill search field (max 448px wide) floating above the grid, right-aligned.
- Filter sidebar (256px, right edge): 'تصفية' with a filter icon, then 8 groups — الجنس, النوع, الدار, عطور زيتية, فوده, فاخر, الأداء, الترتيب — plain 16px checkboxes with 14px labels and hairline separators, inside their own scrollbar.
- Grid: 3 columns × 304px cards, 24px gaps. Featured cards are cream with a gold double border; standard cards are white with a 1px  border. Each card: 272px product photo on white, name (18px bold), 'اختر الحجم' 10px label, four 32px pills, purple price (24px) + 'شامل الضريبة', a pale-green shipping chip, a gold 'اشتر الآن' button and a light-green 'أضف إلى السلة' button.
- Floating chat card bottom-left (purple gradient, gold medallion, 'مش عارف تختار عطرك؟ اسألني!') overlapping the filter column's last rows.
- Below 14 rows of cards: FAQ (3 accordions), Policies (3 accordions), Contact (WhatsApp + e-mail outlined buttons), then a grey footer with one description, two link columns and a 12px copyright line.

### E.2 Homepage — 375×812

- Header: hamburger (filter) + cart on the left, 80px logo on the right; 60% of the bar is empty white.
- Hero band with 160px frames; only ~2.2 frames visible, cut at both edges.
- Full-width search field, then a single-column grid where one card is 677px tall (83% of the screen); the page is 12,089px long (~15 screens).
- The chat card floats over the bottom of the grid and covers the shipping chip / CTA row of whichever card is in view.

### E.3 Product detail — 1440×900 (`/product/pf020`)

- Breadcrumb 'الرئيسية › أفريكان ليذر' top-right; 2-column split with a large 600px gallery on the right (grey rounded panel, `object-contain`, single image) and the info column on the left.
- Info column: 'نيش' gold pill, 36–40px H1 'أفريكان ليذر', 18px brand 'Parfums De Foda', separator, a 2-column spec grid (الجنس/النوع/الدار/الفصل/الأداء) with visible empty half-cells, separator, 'الوصف' + one 2-line paragraph, separator, 'اختر الحجم' + four pills, 30px purple price + 'شامل الضريبة', gold 'اشتر الآن', green 'أضف إلى السلة', then 'متابعة التصفح'.
- No reviews, no notes pyramid, no shipping/returns/authenticity block, no related products.

### E.4 Product detail — 375×812

- Header without any navigation; breadcrumb; full-width gallery; then the info column stacked. The chat card overlaps the price/size area, and the fixed header clips the top of the content while scrolling.

### E.5 Cart drawer — 375×812

- Right-side sheet (~343px) over a 10% black scrim; 'سلة التسوق' + '1 الكمية'; one row with a 64px thumbnail, name, '10 مل', a − 1 + stepper of 24px buttons and a 12px trash icon; empty space below; footer with المجموع ١٢٠ ج.م, مصاريف الشحن ١٠٠ ج.م, الإجمالي ٢٢٠ ج.م and a full-width light-green 'إتمام الطلب'.

### E.6 Checkout — 375×812

- 'العودة للمتجر' back link, 24px 'إتمام الطلب', 'بيانات التوصيل' section with 6 labelled fields (each 44px tall, 12px labels, 12px icons), one full-width green submit button reading 'تأكيد الطلب — ٢٢٠ ج.م'. Order summary sits *below* the form; no payment method is shown anywhere.

### E.7 Success — 375×812

- Centred 80px pale-green medallion with a green check, 24px 'تم استلام طلبكم بنجاح', 14px 'وسيتم التواصل معكم على واتساب لتأكيد الطلب', a bordered card with 'رقم الطلب' and 'PDF-20261020-00001' plus a 24px copy icon, a grey 'ملاحظة' block, and a full-width light-green 'العودة للمتجر'.

### E.8 Screens not reachable

There is no catalogue page, category page, about page, contact page, policy page, account page, wishlist page or admin UI to screenshot — they do not exist in the route table.
