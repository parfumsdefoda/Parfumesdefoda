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
