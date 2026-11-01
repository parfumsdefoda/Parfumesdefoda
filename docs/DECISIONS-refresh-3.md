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
