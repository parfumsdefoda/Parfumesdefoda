# UI Review — RUN 1.6

Evidence: `.qa/f16/{375,768,1024,1280,1440,1920}-{home,shop,pdp,pdp-oos,pdp-long,footer}.png`
(`scripts/f16-shots.mjs`, production build served on :3229).

## Header (F1) — YES
- Single 64px row at ≥1024px; 76px below (unchanged). Nav at inline-start,
  lockup dead-centre (measured within 2px of viewport centre in
  `e2e/header.spec.ts`), tools at inline-end. No second row, no hairline
  crossing the logo, no bounding-box overlap (intersection check passes).
- Only 4 nav links: رجالي · حريمي · للجنسين · زيوت عطرية. "المتجر" and the
  الدور houses dropdown are gone from desktop nav and mobile sheet.
- Green WhatsApp button (`--brand-green` fill, purple label, 1px purple
  border, radius 0, 40px tall; icon-only below 1180px). Token pairs:
  purple-950 on brand-green = 9.08:1, brand-purple on brand-green = 5.57:1
  (both ≥ 4.5:1, locked in `design-tokens.test.ts`).
- Logo decision: `public/logos/logo.svg` is a transparent vector
  (viewBox 149.33×146.37, purple #632989 + green #9CD676) — no white box, so
  no `mix-blend-mode: multiply` and no plate on paper. Emblem 44px, tracked
  wordmark; emblem only below 400px.

## Footer (F3) — YES
- Brand green background from the token, purple text throughout, 1px purple
  hairline on top, no gold. Logo ~120px on desktop / ~88px mobile, seated on
  an ivory plate with a 1px purple border (the SVG's own green fill would
  vanish on green, so a flat plate — never a stray white box). Contact
  column + copyright only; no help column; `#contact` resolves.

## Desktop density (F2) — YES
- `repeat(auto-fill, minmax(240px, 1fr))` from 1024px: 4 cols @1024, 5 @1280,
  6 @1440, 7 @1920 (8×240 = 1920 exactly, desktop scrollbar takes ~15px).
  Cell width at 1440 lands in 240–300px. Mobile keeps 2/3 columns.
- Compact chrome: PDP container 1200 (stage ≤560, info ≤520); cart/checkout
  1100; FAQ/contact already under 1100. Home: 12 on mobile, exactly 2 full
  rows on desktop (pre-paint trim + resize island, no layout shift).

## Mobile identical — YES
- 375: same row (hamburger, centred emblem, search, cart), same 2-col grid,
  same card geometry. `e2e/header.spec.ts` phone test + 375 screenshots
  confirm; baseline snapshots regenerated only where desktop changed.

## Out-of-stock (F4) — YES
- The six products (pf140/470/680/720/780/820) stay visible, sink after all
  in-stock cards, show muted name + "غير متوفر" (no price, no quick-add);
  PDP shows all sizes disabled with no add button, OutOfStock JSON-LD, and
  a persisted cart line raises the stale-line (`size-unavailable`) message.
- Longest name (pf630, فالانتينو دونا بورن ان روما جرين سترافاجانزا):
  h1 wraps in 2 lines, breadcrumb truncates safely, no clipping seen.

## Grid regression (F6) — fixed, was NO
- Root cause: the card used `rounded-[16px]`/`rounded-[14px]`, a pill
  quick-add with a soft shadow, and the photo frame carried a separate paper
  background + a blurred ground-shadow span — a second colour and a second
  shadow inside the cell. Now: radius 0 everywhere, no shadow, one card
  background (ground span kept only outside cards). `e2e/card-contract.spec.ts`
  asserts radius/shadow/background/hairline on every cell element.

## Open items / deviations
- `locales/ar.json` keeps `nav.shop` (shop page titles and breadcrumbs still
  read it); only `nav.houses` was deleted.
- pf090 was already fully removed in the previous run (not merely hidden),
  so `--hide-absent` had nothing to hide for it; pf231/pf540/pf670 are the
  ones hidden by this run's apply.
- PF630's original photo did **not** change (only PF390/430/600/660/700).
- The `data:refresh` importer does not rewrite `seo.title` on rename; five
  stale titles were fixed directly in this run (including the banned
  "فاخر" on pf091). Worth a follow-up in the importer.
