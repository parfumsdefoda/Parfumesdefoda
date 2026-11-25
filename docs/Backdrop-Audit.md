# Backdrop audit — RUN 3

## What was measured

Every derived image in `src/data/image-manifest.json` (77 entries, cover + gallery
views) was decoded from its largest WebP and its **real** alpha measured, rather
than trusting the manifest label:

| Measured class | Entries | Notes |
|---|---|---|
| Has alpha | 66 | includes the two entries the manifest labels `pure-white`/`multiply`; those files do carry alpha pixels |
| No alpha, eligible | **0** | nothing qualified for gain + multiply |
| No alpha, ineligible | 11 | all rejected by the four-side agreement test |

The rule (`src/lib/backdrop.ts`): 6px border ring, median RGB per side, sides must
agree within 12 per channel, WCAG relative luminance ≥ 0.82, per-channel σ ≤ 10
across the ring; gain = 255/median per channel, clamped to 1.25.

## The eleven excluded photos

`pf090`, `pf290`, `pf480`, `pf570`, `pf571`, `pf572`, `pf600`, `pf630`, `pf680`,
`pf700`, `pf720` — measured backdrop colours, lightness and variance are in
`.audit/needs-retouch.txt`.

Visual confirmation (`.qa/backdrop-sheet.png`, built for the 11, inspected at card
size on paper): every one is a scene or coloured still-life — green velvet, red
lacquer, black glitter, a tape collage, blue and pink fabric, gold surfaces. The
closest case is **pf680** (`#e9e9e9`, L 0.815, σ 9.9): a still-life on a light
surface with a strong cast shadow and a glass pipette. Brightening it to pure white
would leave a rectangle plus a shadow, so excluding it is correct.

## What was applied

**Nothing.** With zero eligible photos there was no derivative to regenerate, no
manifest change, and therefore no product to visually reject and revert. No file
under `public/products/` was rewritten in this task; originals were never touched at
any point.

The next real cut-out that arrives through `npm run build:images` (a transparent
PNG) needs no normalisation at all. A flat white studio photo needs the gain path,
which is covered by unit tests but has not yet been exercised on a catalogue photo.

## Owner guidance

`docs/Owner-Guide.md` now says, in Arabic: prefer a transparent PNG named
`PF###.png`; a flat, shadowless white backdrop is normalised automatically; any
other background (scene, colour, strong shadow, gradient, several bottles) is not
altered, is shown with `cover`, and is listed in `.audit/needs-retouch.txt` until it
is replaced.
