# Decisions — ui-polish

One line per decision, with the alternatives that were rejected and why.
Entries are added as each task is implemented.

## P1 — the product-free hero

- **The hero keeps its `<section data-hero-sentinel>` element.** Rejected:
  putting the sentinel on a sibling empty div (the header's observer and the
  page's `--header-offset` maths already agree on this element, and a second
  element would be dead markup).
- **`heroProducts` stays in the zod schema but is no longer read by the service
  or typed on `FullSettings`.** Rejected: deleting the key (an owner's existing
  `settings.json` would then be re-validated against a stricter shape for no
  gain) and keeping it wired to a component that no longer has products.
- **The entrance animation starts at `opacity: 0` with a 60–220 ms stagger.**
  Rejected: animating only `transform` (reads as a hard snap) and a long
  pseudo-element reveal (nothing to reveal — there is no image). The stagger is
  short enough that the headline is the LCP paint.
- **`text-wrap: balance` plus a `max-w-[18ch]` measure carries the no-widow
  rule.** Rejected: inserting a non-breaking space in the locale string (that
  is the owner's text, and it would break at other widths).
- **`min-height: calc(100svh - var(--header-offset))` on the hero's inner
  column.** Rejected: a fixed pixel height (would clip the CTA at 320px) and no
  minimum (the hero would collapse to three lines on a tall desktop).
