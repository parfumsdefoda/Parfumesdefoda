# Decisions — `ui-luxury`

One line per decision: what was chosen, what was rejected, and why. Written
during the run so a later reader never has to reverse-engineer a judgement call.

## Run setup

- **Branch** — `ui-luxury` cut from `launch-ready` (`4e156f2`), because
  `launch-ready` exists and is 7 commits ahead of `perf-1`. Rejected: cutting
  from `perf-1` (older), from `main` (behind both).
- **Pre-existing working-tree change left untouched** — `public/products/PF090.png`
  and `public/products/PF091.png` are modified in the working tree (their byte
  sizes are swapped with each other) and were already modified before this run.
  They are byte-identical between `perf-1` and `launch-ready`, so no commit, no
  revert, no stash: owner bytes are preserved and reported at the end.
  Rejected: committing them (not mine), restoring them (destroys owner work).

## U1 — season filter removal

- **`season` leaves `FILTER_KEYS` entirely** rather than staying as a key the UI
  hides. Chips, counts, the filter sheet, the popover and the URL serializer all
  iterate `FILTER_KEYS`, so one removal covers every surface and a legacy
  `?season=…` is dropped by the existing "unknown value" rule — no special case,
  no error, no chip, nothing written back.
  Rejected: keeping the key with an `enabled: false` flag (four code paths would
  still have to remember to skip it).
- **`season` stays optional data** in the zod schema, `products.json`, the master
  importer, search, related-products ranking and the PDP "الفصل والأداء" row.
  Rejected: deleting the column (the owner's data is not ours to drop).
- **`next.config.ts` keeps `season` in `CATALOG_QUERY_KEYS`** so an old
  `/?season=…` link still 308s to `/shop`; `/shop` then ignores the value.
  Rejected: removing it (that would turn a working old link into a 404-ish
  homepage).

## U2 — premium card

- **The frame replaces the badge** rather than joining it: `isPremiumProduct()`
  (master `is_featured`) drives a 2px gold ring drawn as an `::before` overlay
  with `mask-composite`, so a premium card and a normal card are the same box.
  Rejected: a wrapper element or extra padding (would change card height and
  break the row rhythm).
- **Badge priority is now coming soon > out of stock > none.** The gold "فاخر"
  badge is gone from the card, the PDP and `FeaturedBadge`; the text label
  survives only as the "◆ فاخر" prefix on the meta line (gold TEXT token,
  4.7:1). Rejected: keeping the badge for screen readers (aria would then
  announce a badge sighted users no longer see).
- **The dark stage is alpha-gated.** Premium products whose derived image has
  real transparency (`src/data/image-manifest.json`) get the dark purple stage;
  a white-background or collage photo keeps the light stage and only the ring,
  because a dark stage behind a rectangle of white photo looks like a bug.
  Rejected: forcing the dark stage everywhere.

## U3 — floating glass header

- **`header-gap` + `--header-capsule` → `--header-offset`** as the single value
  the page pads by, with the hero cancelling it. Rejected: per-page padding
  numbers (four call sites would drift).
- **Tone flipping is an attribute write, not React state.** The island uses an
  `IntersectionObserver` on the hero's sentinel and sets `data-tone` on the
  element, so scrolling past the hero never re-renders the header (and the
  server still renders the first tone, so there is no flash). Rejected: a
  scroll listener with `useState` (re-render on every frame, hydration noise).
- **The header keeps `z-30` and every modal stays at `z-50`.** The PDP buy bar
  and the advisor bubble sit at `z-40`, above the capsule. Rejected: raising the
  header (it would cover the buy bar it must never cover).
- **The thin dark line above the header was the old bar's full-width
  `data-scrolled` hairline** at the top of the document; the floating capsule
  has no full-width element at `top: 0`, so it is gone rather than patched.
- **The nav's oils link now filters `?form=زيوت عطرية`** (the value the parser
  understands) instead of `?form=oil`, which the parser dropped — so the item
  used to open the unfiltered catalogue.
- **After Escape the search list reopens on the next keystroke or ArrowDown.**
  The field keeps focus, so a dismissed list that stayed dead was a real dead
  end. Rejected: blurring the field on Escape (drops a keyboard user's focus to
  `<body>`).

## U4 — catalogue toolbar search

- **44px, `--color-surface-muted` fill, `--color-border-strong` edge, brand
  focus ring — the header's panel field, not the header's 36px pill.** The
  toolbar is a form row, not a floating capsule, and 44px keeps the touch
  target rule. Rejected: copying the pill verbatim (a 36px input beside 44px
  buttons looks like a mistake).

## U5 — measurement

- **Baseline is the recorded harness runs on the parent branch, not a fresh
  rebuild of `launch-ready`.** A second worktree plus a second production build
  was rejected: the tree carries owner image swaps (`PF090`/`PF091`) that a
  checkout must not disturb, and the phase-6/QA numbers come from the same
  machine, profile and throttling.
- **Screenshots are ignored by git** (`/.audit/*/`), matching the existing
  `/.audit/*.png` rule: they are evidence for the report, not repository content.
- **`docs/Testing.md` created** — the launch checklist and the QA report both
  pointed at a document that did not exist (OPEN-9).
