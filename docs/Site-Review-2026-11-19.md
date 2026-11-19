# Site Review — 2026-11-19

## Summary
Catalogue synced with the refreshed master (78 rows at `data/product-master.csv`
—the goal's `data/import/product-master.csv` does not exist; the owner's file
sits at the repo path and was used as source of truth). Two products activated,
one removed product restored as a hidden tombstone with a 308 redirect. Full
gate green (validate-json, check:tokens, typecheck, lint 0 errors, vitest
528/528, build). Smoke test on the production build passed on every assertion.
No checkout logic was changed; no visual design changes beyond the existing
out-of-stock state.

## Catalogue sync (Step 1)

**Added (visible):**
- **PF880** — وود اند مود يونيك لكجري (للجنسين · غربي · نيش · أداء صاروخي),
  sizes 100/50/30/10 ml @ 850/600/400/150, all in stock.
- **PF900** — أومبر ليفانت (للجنسين · شرقي · نيش · أداء صاروخي), same sizes/prices.
- Both: `/products/<SKU>.webp` originals already WebP (RIFF/WEBP magic, no sharp
  conversion needed), derived tiers + manifest built (`cutout`/`transparent`),
  working `/product/<slug>`, in `generateStaticParams` and sitemap, on the home
  grid, search and all filters. Verified by smoke test (200 + names present).

**Removed / hidden:**
- **PF090**: restored from git history (`5450715`) as `hidden: true` in
  `products.json` (data kept, never rendered). `/product/pf090` and
  `/product/PF090` return **308 → /product/pf091** (`next.config.ts` redirects).
- **PF240** (تيروني, featured flag still on): hidden, `/product/pf240` → 404,
  absent from grid/search/filters/counts/sitemap/static params.
- **PF231/PF540/PF670**: only-in-JSON rows, already hidden, remain hidden.
- **PF091** renamed "أمواج انترلود", featured, `similarTo` empty. **PF740**
  renamed "ناين بي إم ريبل", **PF840** renamed "أمواج جوبيليشن حريمي".

**Out of stock (still visible):** PF140, PF470, PF680, PF720, PF780, PF820 —
no buyable size. Card shows the lowest listed price (no NaN, no crash);
PDP shows all sizes disabled with no add-to-cart button.

**Premium category:** exactly one visible featured product (PF091). The filter
still works with a single item (verified: `/shop?featured=1` 200, renders
أمواج انترلود). Category is not hidden or removed.

**Missing images:** none for visible products. PF090's original file is gone
(was deleted with the product) — the hidden tombstone points at
`/products/PF090.webp` which does not exist, but it is never rendered.

## Fixed now
1. `next.config.ts`: 308 redirects `/product/pf090` + `/product/PF090` → `/product/pf091`.
2. `data/products.json`: PF880/PF900 created via `data:refresh --apply
   --sync-commerce --create-missing --hide-absent`; PF090 tombstone restored
   as hidden.
3. `public/products/PF880.webp` + `PF900.webp` + derived tiers + `image-manifest.json`.
4. `docs/UI-REVIEW.md` (RUN 1.6 review) and perf scripts already point at pf020.

## Recommended next (priority order)

**High**
1. **Root clutter tracked in git**: `Ref/` (Des-ref.jpg, Logo.rar, Logo.svg,
   Ref.jpeg, perfume_website.html) is committed. Remove with `git rm -r Ref`
   (or move out of the repo) — it ships design references in the repo.
2. **npm audit: 11 moderate, 0 high/critical.** All via `minimatch` (DoS, glob
   amplification) through `shadcn`/`ts-morph` and `@typescript-eslint`. Fix with
   `npm audit fix` (no `--force` needed for most); breaking changes only via
   `--force` — deliberately not run.

**Medium**
3. **Fonts**: `src/app/fonts.ts` and `src/config/fonts.ts` duplicate the Cairo
   config (config re-exports app). No `next/font` is used — Cairo is
   self-hosted via `@font-face` in globals.css (offline-build rationale in the
   file). Keep one module; delete `src/config/fonts.ts` (nothing imports it).
4. **Lint warnings (25, 0 errors)**: pre-existing unused vars
   (`product-gallery.tsx`: `PremiumOverlay`, `hasTransparentCutout`;
   `header-bar.tsx` `trigger`, etc.). Safe to clean in a dedicated pass.
5. **Upstash Redis unconfigured**: build + runtime emit
   `[Upstash Redis] url/token missing` — orders fall back to random order
   numbers and in-memory rate limiting per instance. Set `UPSTASH_REDIS_REST_URL`
   / `UPSTASH_REDIS_REST_TOKEN` in production, or accept the fallback.

**Low**
6. `data/sizes.json` is not imported by any `src/` code (grep clean) — dead
   data file. Delete or keep as documentation.
7. `tsconfig.tsbuildinfo` at root is gitignored (`*.tsbuildinfo`) but present
   on disk; harmless.
8. Report files at root (`SITE_AUDIT_REPORT.md`, `FINAL_RELEASE_REPORT.md`,
   `PROJECT_*.md`) — consider moving to `docs/` or deleting.
9. `src/app/fonts.ts` variable export vs `@font-face` in globals.css: two
   places declare the family (harmless duplicate).

**Not changed (by design):** no file deletions of anything not provably unused;
no `npm audit fix --force`; no checkout logic changes; no visual changes.

## Detailed findings (Step 2)

### A) Health
- typecheck: pass. lint: 0 errors, 25 pre-existing warnings (unused vars/
  expressions, 2 `window.location.href` in catalog controls). vitest: 528/528.
  build: pass, 78 static pages, 58 product pages.

### B) Performance
- First Load JS (brotli, production server): `/` 192 KiB, `/shop` 202,
  `/shop/men` 202, `/product/*` 205, `/cart` 198, `/checkout` 243
  (budget 260). All within budget; nothing flags >240 KiB except checkout
  (inside its 260 KiB budget).
- Images: `public/products` 17 MB total (3 MB originals + 14 MB derived).
  No original over 150 KB (largest PF571 136 KB, PF630/PF660 112 KB).
- Product images use the custom `<picture>` pipeline (derived AVIF/WebP with
  `sizes`, lazy below fold, eager+high-priority first row) — `next/image` is
  deliberately not used (documented in the component). No CLS from image
  loading (square/aspect boxes).
- Fonts: self-hosted Cairo woff2 subsets, `font-display: swap` via
  `@font-face`; the `next/font` module is a stub (see recommendation 3).
- `products.json` is loaded server-side via `readJsonFile()`; client islands
  receive props — it is not shipped to many client components (grep clean
  outside services/lib/tests).
- 53 `use client` components, mostly Shadcn primitives and feature islands
  (cart, catalog controls, search, purchase) — consistent with the
  server-first architecture; no heavy dependency added.

### C) Product page & SEO
- Unique `<title>` per product (`<name> | Parfums De Foda`), meta description,
  canonical, OG image (derived pdp-2000), JSON-LD Product with
  `availability` InStock/OutOfStock (OutOfStock offer for the six OOS items),
  `lang="ar" dir="rtl"`, Arabic alt text, sitemap (66 URLs) and robots.txt
  contain only visible products.

### D) Accessibility & UX
- All icon-only buttons carry `aria-label` (cart, search, menu, close, logo).
  Gold text uses `--gold-700` (#7a5a12, 5.1:1 on white — WCAG AA). Focus rings
  via `--color-focus`. Tap targets ≥44px. Header geometry tests cover
  no-overlap and centring. No horizontal overflow at 375–1920 (e2e).

### E) Security & robustness (`/api/orders`)
- Zod `orderRequestSchema` shared with the checkout form; body capped at
  64 KiB (checked via Content-Length and actual bytes read); items 1–30 lines,
  quantity 1–20; Egyptian phone regex; same-origin check rejects cross-site
  posts; Upstash sliding-window rate limit 5 orders/10 min (in-memory
  fallback); server-minted order numbers; prices recomputed server-side;
  no PII in logs (order number + channel booleans only); safe generic
  error messages. API keys (`OPENAI_API_KEY`, `RESEND_API_KEY`, Redis) are
  server-only env vars, never exposed to the client. No hard-coded secrets
  found. `npm audit`: 11 moderate (minimatch via shadcn/ts-morph, eslint —
  build tooling DoS), 0 high, 0 critical.

### F) Code hygiene
- No knip/ts-prune installed; unused detection by search: `src/config/fonts.ts`
  (unimported), `data/sizes.json` (unimported), `BEST_SELLER_LIMIT` still
  imported once (kept, used by the constant's sibling). `console.log` only in
  server logs (order/email/whatsapp — intentional, log-mode previews).
  Root clutter: `Ref/`, `*.tsbuildinfo` (ignored), 4 audit/report `.md` files.
  `.gitignore` covers `.next`, `node_modules`, `.env*`, `.vercel`,
  `*.tsbuildinfo`, `.backups/`, `data/products.backup.json`.

## Metrics
- First Load JS (brotli): home 192 KiB, PDP 205 KiB, checkout 243 KiB.
- Images: originals 3 MB (79 files, max 136 KB), derived 14 MB.
- Catalogue: 82 entries in products.json, 58 visible, 24 hidden; 78 master rows.
- Sitemap: 66 URLs, no hidden products.
