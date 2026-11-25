# UI Gallery — decision log

- **R1-1: `:root[data-palette]`, not `:root`.** The palette blocks already set
  `color-scheme` on an attribute selector, so a plain `:root` rule lost on
  specificity and the page reported `normal`. *Alternative:* `!important`
  (rejected: hides the specificity problem). *Why:* equal specificity plus
  source order is the smallest correct fix and survives both palettes.

## R1-3 — card and grid

- **Cell shape.** One cell = square image box + text block, hairline on the
  inline end and block end only, paper everywhere, radius 0.
- **Photo treatment** comes from the image manifest, never from the file name:
  `multiply` → `object-contain` + `mix-blend-mode: multiply`; a transparent
  cut-out → `object-contain` + one drop shadow cast on the paper; anything else
  → `object-cover`.
- **0.78 image-box ratio cannot be met.** Contract C asks for the image box to
  be at least 0.78 of the cell height, while contract X reserves a 44px action
  slot under a two-line name. With a square image the cell is
  `width + 160px`, so the ratio is 0.69 at a 360px cell and reaches 0.78 only
  above ~570px per card — never in a four-column grid at 1440 or 1920
  (measured 0.66 at 1440, 0.50 at 375). The slot and the text are both
  explicit, so the ratio is the number that gives; `e2e/card-contract.spec.ts`
  enforces the square box, full cell width, hairline, radius 0, no shadow,
  centring and the reserved slot instead.
- **Action slot.** It is always 44px tall, so hovering moves nothing. On fine
  pointers the button is transparent until hover/focus-within; on coarse
  pointers it is visible from the start.
- **Obsolete specs removed.** `e2e/card-hover.spec.ts` and
  `e2e/premium-card.spec.ts` described the capsule card (lift, glow, ring
  sweep, three-part meta line) and were replaced by `e2e/card-contract.spec.ts`.
