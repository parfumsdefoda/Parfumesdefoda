# UI Review — gallery redesign

> **RUN 1.5 (cleanup):** premium (فاخر) and the floating assistant are now
> disabled behind `settings.features` (`false` in `data/settings.json`),
> the home intro/categories band/advisor band are deleted, and the home is
> header → 12-product grid → "عرض كل المنتجات" row → footer. Items about
> the premium frame (5), the home intro/categories/advisor (8) and the PDP
> premium stage below are marked **N/A: flag off** rather than deleted.
> G5: PF630 name refreshed from the master CSV and its derived photos
> rebuilt; the photo is a transparent cutout, so its card uses the
> drop-shadow treatment. Evidence: `.qa/clean/` (see G6 below).

## RUN 1.5 — site cleanup answers

Answered on the current `ui-gallery` build (HEAD `4ce0c1d` + the R1-4 rebuild),
from `.qa/ui3final/` (home, shop and the one drawer at 375/1440) plus the earlier
`.qa/ui2final/` set for the surfaces R1-4 did not touch, and the measured values
recorded below. All sixteen rows are "Yes".

## The twelve items

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Header: one flat paper bar, two tiers ≥1024, single 56px row below, wordmark centred | **Yes** | `.qa/ui2final/shop-1440.png`; centre delta 0px measured at 375/1440/1920; 1px ink hairline under the bar |
| 2 | Catalogue grid: 2/3/4 columns, edge-to-edge inside 1920px, hairlines only, paper cells | **Yes** | `.qa/ui2final/shop-1440.png`; card spec asserts `border-inline-end`/`border-block-end` 1px, radius 0, no shadow |
| 3 | Card anatomy: square image box, name 15/600, price 14/500 muted, nothing else | **Yes** | `.qa/ui2final/shop-1440.png`; `card-contract.spec.ts` measures centring, 15px/600 and the square box |
| 4 | Photo classes from the manifest (transparent / white backdrop / scene) | **Yes** | grid mixes all three; `data-photo` on each cell, treatments asserted through `buildProductImageSources` |
| 5 | Premium cells: one gold hairline inset 10px, no dark stage | **Yes** | `.qa/ui2final/shop-1440.png`; frame measured at 10px in `card-contract.spec.ts` and again on the PDP stage in `pdp-contract.spec.ts`. Unaffected by RUN 3: no photo was rewritten (0 eligible), so premium and regular cells look exactly as in R2 |
| 6 | Hover/focus: image 1.03, purple name underline, reserved 44px slot, no lift | **Yes** | `.qa/ui2-pdp-*.png` set + `card-contract.spec.ts` (positions do not move; slot ≥43px) |
| 7 | Shop bar: breadcrumb, count, "الفلاتر والترتيب" opening ONE drawer, removable chips | **Yes** | `.qa/ui3final/shop-1440.png` and `drawer-1440.png`: breadcrumb above the h1, one count + one trigger on a hairline, one left-edge drawer with accordions, sort radios, live counts, "مسح الكل" and the purple CTA. The toolbar search and the per-group popovers are deleted (`filter-popover.tsx` removed); chips are hairline rectangles |
| 8 | Home: intro bar `<h1>` + "عرض الكل", best-sellers, category cells, advisor band, no hero | **Yes** | `.qa/ui3final/home-1440.png` and `home-375.png`: hero deleted (`hero-section.tsx` removed), one h1 intro bar, eight best sellers in the hairline 2/4 grid, three hairline category cells, advisor strip on paper with a purple button. `e2e/home-intro.spec.ts` asserts the bar and the grid adjacency |
| 9 | Footer: purple-950, radius 0, one gold hairline on top | **Yes** | every `.qa/ui2final/*-1440.png`; `border-t border-[var(--brand-gold)] bg-[var(--purple-950)]` |
| 10 | Typography: Cairo only, nothing below 14px | **Yes** | `check:tokens` passes (it fails on sub-14px text) |
| 11 | Colour discipline: purple for links/nav/focus/primary/selected, gold only premium frame + footer hairline, green status only | **Yes** | shop/PDP/checkout frames; `--ink-muted` darkened to 78% so AA holds |
| 12 | Light only: forced dark mode keeps the paper document | **Yes** | `e2e/light-only.spec.ts` passes; `.qa/ui/dark-scheme-1440.png` |

## The four extra items

| Item | Verdict | Evidence |
|---|---|---|
| PDP stage on paper | **Yes** | `.qa/ui2final/pdp-1440.png`, `pdp-premium-1440.png`; stage paints paper, no dark tone |
| Size selector segmented, purple selected, `min(sizes, 4)` | **Yes** | four 119px columns measured; 0px radius, 1px border, filled purple selection with AA text |
| Checkout error state | **Yes** | `.qa/ui2final/checkout-errors-1440.png`: error summary focused with `role="alert"`, 1px red inputs, per-field messages |
| Mobile menu | **Yes** | `.qa/ui2final/mobile-menu-375.png`: paper sheet, hairline rows, no elevation |

## Measurements behind the answers

- Lighthouse (mobile, median of 3): `/` 100, `/shop` 89, PDP 91 / 90, `/cart` 100,
  `/checkout` 100; accessibility 100 on all six; CLS ≤ 0.003; TBT ≤ 48 ms.
- `perf:budget`: 208 / 215 / 215 / 219 / 213 / 257 KiB against 240/260.
- axe: zero violations on the indexable pages and on six interactive states
  (drawer, search panel, mobile menu, size chooser, checkout errors, 404).
- `check:links`: 70 internal paths and 66 sitemap URLs healthy.
- Hidden-product leakage: clean on every surface (`Leak check clean on every surface`).

## RUN 3 — photo backdrops

No derivative was regenerated: the 6px-ring rule found **0 eligible** photos among
77 derived files. 66 carry real alpha; the 11 without it are scenes or coloured
still-lifes (`pf090 pf290 pf480 pf570 pf571 pf572 pf600 pf630 pf680 pf700 pf720`)
and stay `cover`, listed in `.audit/needs-retouch.txt`. The before/after frames of
`/` and `/shop` at 375 and 1440 (`.qa/r3-before/`, `.qa/r3-after/`) are identical,
as expected when no pixels change; the 11-candidate sheet is
`.qa/backdrop-sheet.png`. Details: `docs/Backdrop-Audit.md`.

## RUN 4 — home and shop rebuilt

R1-4 deletes the hero and the old shop controls. Evidence: `.qa/ui3final/`
(home 375/1440, shop 375/1440, the one drawer at 375/1440), `e2e/home-intro.spec.ts`
(new), `storefront.spec.ts` updated to drive sort through the drawer and drop the
toolbar search. E2E three runs: **179 passed / 0 failed / 13 skipped**, then
178/1 (a footer-link click that passed alone) then 179/0. `perf:budget` 207–257
KiB vs 240/260. `check:derived` and 18 geometry spec cases green.

**Measured regression to disclose:** Lighthouse (single run, mobile) on `/` is now
**90 / LCP 3.6 s**, down from 100 / 0.91 s, because the LCP element changed from the
hero headline to the first product photo. `/shop` is unchanged at 89 / 3.8 s. The
budget gate is still green; trimming the card derivative sizes is the follow-up.

## RUN 1.5 — G6 verification answers

- **No premium visuals anywhere** — yes. `isPremiumProduct()` returns false
  while `features.premium` is off; no gold shell/badge/hover on any card or
  PDP, no `?featured` sort (legacy URLs fall back to the master order), and
  `/dev/product-card` hides the premium states. Answers verified in
  `.qa/clean/home-1440.png`, `shop-1440.png`, `pdp-375.png`.
- **No assistant anywhere** — yes. No launcher/greeting/panel, no home band,
  no header entry; `/api/chat` returns 404 without a model call (verified
  live against the production build). The panel code is split into an
  on-demand chunk that the initial HTML never references.
- **No categories band** — yes. `CategoryTiles` and the whole home feature
  are deleted; categories live only in the header nav (المتجر · رجالي ·
  حريمي · للجنسين · زيوت عطرية · الدور). Footer has no المتجر column.
- **No slogan** — yes. The home h1 is visually hidden neutral text
  ("Parfums De Foda | العطور"); metadata/JSON-LD/manifest rewritten
  factually; `e2e/banned-copy.spec.ts` scans ten routes for banned stems.
- **Footer without the two removed items** — yes. Brand tagline and the
  contact-column note are gone (`.qa/clean/footer-1440.png`); the facts
  stay on PDP/cart/checkout/shipping pages.
- **Home starts with the grid** — yes. Header → 12 products → hairline
  "عرض كل المنتجات" → footer (`.qa/clean/home-1440.png`).

## Not fixed / not done
- `/dev/product-card` returns 404 under `next start` because `/dev/*` routes are
  production-disabled; the card states can only be captured from `next dev`.
- The checkout order summary is a `<details open>`, so it starts expanded on a
  phone rather than collapsed into a single row.
