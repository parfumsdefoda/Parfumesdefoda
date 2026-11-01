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
- **The entrance is split: the ornament draws, the lead and CTA fade up (140 /
  220 ms), the headline does not move at all.** Rejected: a fade-up on every
  element including the `<h1>` (it is the LCP paint, see below; and a transform
  is a layout shift, see the next bullet).
- **The headline never starts at `opacity: 0`.** The first build faded it in
  and the simulated mobile LCP went from 1.21 s to 4.21 s (the observed LCP was
  still 443 ms): an opacity-0 `<h1>` is not an LCP candidate until the animation
  paints it. The headline is the LCP element (1.21 s) and is painted with the
  first frame.
- **The headline does not translate either.** A 14 px `translateY` entrance is
  reported as a layout shift on the `<h1>` itself (CLS 0.0016 on `/`); with the
  budget at 0 the rise was removed. Rejected: a 6 px rise (still non-zero) and
  a clip/mask reveal (a reveal, not the intended rise).
- **The headline's measure is a fixed `rem`, not `ch`.** `max-w-[18ch]` is
  measured from the fallback font before Cairo arrives, so the shrink-to-fit
  box (and the centred text) jumped from 360 px to 380 px at first paint — the
  same 0.0016 CLS. `w-full max-w-[22rem] sm:max-w-[28rem]` keeps the box
  identical for both fonts, and `text-wrap: balance` still avoids the widow.
- **`text-wrap: balance` plus a `max-w-[18ch]` measure carries the no-widow
  rule.** Rejected: inserting a non-breaking space in the locale string (that
  is the owner's text, and it would break at other widths).
- **`min-height: calc(100svh - var(--header-offset))` on the hero's inner
  column.** Rejected: a fixed pixel height (would clip the CTA at 320px) and no
  minimum (the hero would collapse to three lines on a tall desktop).

## P2 — the card hover system

- **`contain: layout style`, not `layout paint`.** The brief asked for paint too,
  but `contain: paint` clips descendants to the padding box and the lifted
  shadow is painted outside it — the lift would be invisible. Layout and style
  containment keep the cost win without deleting the effect.
- **The quick-add pill grows through `inline-size` on the absolutely positioned
  button, not by swapping `size="icon"` for a wider size class.** Rejected: two
  fixed widths would animate a jump, and a content-driven width cannot be
  transitioned.
- **Static cards (`data-card-state="static"`, out of stock and coming soon) keep
  the focus ring but get none of the hover decoration.** Rejected: "muted ring
  only" with a lift (a card nobody can buy should not respond like one they
  can), and removing the focus ring (that would break keyboard use).
- **The pointer island is mounted by each grid and reference-counted into ONE
  window listener.** Rejected: a listener per grid (three on a product page) and
  a listener in the root layout (it would run on checkout, where there are no
  cards).
- **`--card-mx` / `--card-my` instead of a transform on the spotlight.** Moving
  the gradient's centre keeps the layer static; a translated layer would need a
  much larger element to avoid clipping at the edges.
- **The premium ring sweep sets `animation-timeline: auto` explicitly.** Without
  it the hover animation would inherit the `view()` timeline from the entry
  sweep and run on scroll instead of on hover.

## P3 — measurement

- **The hero fixes live here, not in P1.** The headline's entrance and its `ch`
  measure only showed up as LCP 4.2 s / CLS 0.0016 under the measurement
  harness, so both are documented above and committed with the verification
  pass that found them.
- **The WebKit smart-hide spec alternates top/bottom while it waits.** The
  header reads direction from two scroll samples; one jump that lands before
  the header's listener attaches has no previous position and cannot read as
  "down" (reproduced with WebKit at 8 parallel contexts). The spec re-scrolls
  until the handler answers — the `data-hidden` assertion is unchanged.
- **The screenshot harness scrolls back up 140 px before the light-tone shot.**
  Smart-hide hides the capsule on the way down, so a plain `scrollTo` past the
  hero captured a page with no header at all.
