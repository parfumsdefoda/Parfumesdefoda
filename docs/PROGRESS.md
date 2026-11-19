# PROGRESS — ui-gallery

## Baseline (R1-0)
- Branch `ui-gallery` from `6c29aab` (= `a05023c^`), the commit the earlier
  redesign was branched from. All three refresh decision docs and
  `isPremiumProduct` are present.
- Base gate green: validate-json, check:tokens, check:derived, typecheck, lint,
  496 unit tests, build. `rounded-*` uses at base: 154. `data/theme.json` shipped
  `"palette": "noir-or"`.

## Done
- **R1-1 Tokens and light-only** — palette back to `brand`; radii 0 through every
  token except the launcher pill; paper/paper-deep/ink/ink-muted/line/line-soft and
  `--shadow-cast` tokens added; `color-scheme: only light` on `:root[data-palette]`;
  `color-scheme`/`supported-color-schemes` meta tags; body paints paper. New
  `e2e/light-only.spec.ts` (dark emulation keeps ivory, meta present) passes on all
  three projects. Gate green afterwards.

## Remaining (in order)
- R1-2 header (contract H) and its geometry tests.
- R1-3 grid + card (contracts G/C/P/F/X), `/dev/product-card` rebuild.
- R1-4 home + shop (contract B), drawer, chips.
- R1-5 screenshots, `docs/UI-REVIEW.md`, push.
- Runs 2 and 3 after that.

## Status
- Work stopped after R1-1 because the remaining working budget could not carry the
  header, grid and page rebuild to a reviewed state. Nothing was pushed: the
  PUSH STEP requires `docs/UI-REVIEW.md` with no "no", and that file cannot be
  truthfully filled before R1-2..R1-4 exist.

### R1-3 — card and grid

Landed in `a048a06`: rebuilt `ProductCard` (hairline cell, square image box,
centred 15/600 name + 14/500 price, reserved 44px action slot, gold inset frame
on premium cells), hairline `ProductGrid` (2/3/4 columns, 1920px container, no
gaps), paper image stage, and `e2e/card-contract.spec.ts` replacing the two
capsule-era card specs. Card spec: 9 passed across three projects; typecheck,
lint, unit tests, build green.
