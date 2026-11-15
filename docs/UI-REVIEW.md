# UI Review — gallery redesign

Answered on the current `ui-gallery` build (HEAD `bf1bb95` + the R2-3 tests),
from the screenshots in `.qa/ui2final/` (375/768/1024/1440 of every surface) and
the measured values recorded below. A "No" means the surface has not been
migrated yet, not that the design is wrong.

## The twelve items

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Header: one flat paper bar, two tiers ≥1024, single 56px row below, wordmark centred | **Yes** | `.qa/ui2final/shop-1440.png`; centre delta 0px measured at 375/1440/1920; 1px ink hairline under the bar |
| 2 | Catalogue grid: 2/3/4 columns, edge-to-edge inside 1920px, hairlines only, paper cells | **Yes** | `.qa/ui2final/shop-1440.png`; card spec asserts `border-inline-end`/`border-block-end` 1px, radius 0, no shadow |
| 3 | Card anatomy: square image box, name 15/600, price 14/500 muted, nothing else | **Yes** | `.qa/ui2final/shop-1440.png`; `card-contract.spec.ts` measures centring, 15px/600 and the square box |
| 4 | Photo classes from the manifest (transparent / white backdrop / scene) | **Yes** | grid mixes all three; `data-photo` on each cell, treatments asserted through `buildProductImageSources` |
| 5 | Premium cells: one gold hairline inset 10px, no dark stage | **Yes** | `.qa/ui2final/shop-1440.png`; frame measured at 10px in `card-contract.spec.ts` |
| 6 | Hover/focus: image 1.03, purple name underline, reserved 44px slot, no lift | **Yes** | `.qa/ui2-pdp-*.png` set + `card-contract.spec.ts` (positions do not move; slot ≥43px) |
| 7 | Shop bar: breadcrumb, count, "الفلاتر والترتيب" opening ONE drawer, removable chips | **No** | `.qa/ui2final/shop-1440.png` still shows the old rounded filter pills and the toolbar search field. R1-4 is not built |
| 8 | Home: intro bar `<h1>` + "عرض الكل", best-sellers, category cells, advisor band, no hero | **No** | `.qa/ui2final/home-1440.png` is still the dark purple hero. R1-4 is not built |
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

## Not fixed / not done

- **Items 7 and 8** need R1-4 (home rebuild, shop bar and single filter drawer).
  They are the reason this review has "no" and the reason the branch is not pushed.
- `/dev/product-card` returns 404 under `next start` because `/dev/*` routes are
  production-disabled; the card states can only be captured from `next dev`.
- The checkout order summary is a `<details open>`, so it starts expanded on a
  phone rather than collapsed into a single row.
