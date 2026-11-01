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
