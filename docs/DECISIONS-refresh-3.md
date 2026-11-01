# Decisions — refresh-3

One line per judgement call: the decision, the alternatives, and why.

## C1 — homepage sections removed

- **Seam between the advisor band and the footer.** Added a 24 px strip of
  `--color-bg` (plus the footer's existing gold hairline) between them.
  Alternatives: recolour the band to `--purple-700`, or rely on the single gold
  hairline alone. The hairline on its own left the page reading as one tall dark
  block (screenshot), and recolouring invented a fourth dark surface the design
  system does not describe. A seam is pure spacing and changes no token.
- **`home.faqAll` / `home.trust*` locale keys deleted.** They were used only by
  the two removed sections; `product.trustCod` (the PDP trust list) is a
  different key and stays.
- **No `#faq` / `#trust` anchors existed** in the codebase, so nothing needed
  repointing: the footer already links `/faq`, `/shipping-returns` and `/contact`.
- **No FAQPage JSON-LD was ever emitted on `/`** (only Organization, WebSite and
  Store in `layout.tsx`), so there was nothing to remove from the homepage.

## C3 — photo gate

- **The 400 px floor guards ENTRY, not updates.** 22 of the 77 originals are
  exactly 375×500, including two products that are live today (pf590, pf650).
  Alternatives: skip all 22 rows (C3 as written) or lower the floor to 375. The
  first would silently freeze prices and stock on 22 products — 20 of them the
  ones the owner is re-publishing — and would leave ~20 products hidden, which
  contradicts C2's own "77 rows processed". A too-small photo on an EXISTING
  product is now a warning and the row still syncs; a NEW product still needs a
  photo of at least 400 px.
- **The photo name is matched against a directory listing, not `existsSync`.**
  On Windows `existsSync("pf760.png")` succeeds when the file is `PF760.png`;
  the listing catches it and reports a "wrong file name".
- **PNG dimensions are read from the IHDR header**, so no image dependency is
  added and a corrupt/renamed file is reported as unreadable.
- **"Coming soon" is not removed.** `isComingSoon` still guards the badge order,
  the cart and the PDP for data already in `products.json`; the importer can no
  longer create a photo-less product, so this refresh adds none.

## C4 — apply

- **`pf091` moved from the light to the dark premium stage.** Its stored manifest
  entry carried pf090's hash and `background: coloured`; the real `PF091.png` is a
  2000×2000 transparent cut-out. The deriving run corrected the entry, so `pf091`
  is now framed like `pf240`. Not a design change — a data correction.
- **45 unreferenced derived files deleted.** They were the leftovers of that same
  mixed-up entry (framed files for cut-out products and vice versa). Only files
  the manifest no longer names were removed; every referenced tier stays and
  `check:derived` passes.
- **`pf090` stays framed.** It is the one photo with a URL burned into a
  "CAUTION" tape across it; publishing it as a cut-out would crop the watermark
  into the card, so it keeps the full frame and remains on the retouch list.

## C5 — single size

- **The selector is capped at 132px, not made a full row.** A one-option control
  drawn across the whole form reads as a broken grid; 132px keeps the label and
  price legible at 375px and looks like a choice.
- **The E2E spec finds single-size products by property** (`sizes.length === 1`),
  never by slug, so the next single-size product is covered without a code change.

## C6 — pagination

- **Not built.** With 77 visible products `/shop` measures perf 88 (threshold 85),
  TBT 55 ms (100), 2619 DOM nodes (3500) and 215 KiB Brotli of first-load JS
  (240). Every threshold passes, and the spec says not to add pagination then.

## C7 — tests that follow the data

- **Three specs were pinned to slugs that changed state**, not to behaviour:
  `pf091` (no longer a framed photo), `pf290` (now in stock) and the
  out-of-stock ordering (nothing is out of stock). They now derive the case from
  `data/products.json` + the image manifest and skip with a stated reason when the
  catalogue has nothing to assert. No assertion was weakened: the same contracts
  still run the moment the data exercises them.
- **Visual baselines regenerated** for home, shop and the PDP: the homepage lost
  two sections and the grid grew from 47 to 77 cards — the change is the point.
  The snapshots stay Windows-only (`CI` skips them).
