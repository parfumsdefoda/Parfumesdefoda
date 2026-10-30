# Design System — Parfums De Foda

One visual language: warm neutrals, purple for brand and action, gold as a
signature detail, green for status. Restraint over decoration — one chromatic
accent per component, hairlines instead of boxes, and motion that never draws
attention to itself.

## Where the tokens live

| Layer           | File                       | Notes                                                                                                                                 |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens          | `src/app/globals.css`      | The only place colours, radii, shadows, motion and the type scale are declared.                                                       |
| Brand inputs    | `data/theme.json`          | `colors.accent → --brand-purple`, `colors.gold → --brand-gold`, `colors.secondary → --brand-green`, `colors.primary → --brand-white`. |
| Injection       | `src/app/layout.tsx`       | The four brand values are written as an inline style on `<html>` during the **server** render, so no palette flash after hydration.   |
| Contrast mirror | `src/lib/design-tokens.ts` | Reproduces the CSS derivations in TypeScript so the dev page and the test can measure real ratios.                                    |
| Guard           | `npm run check:tokens`     | Fails on raw hex, arbitrary `shadow-[…]`, sub-14px text, or an undeclared `var(--token)`.                                             |

Nothing else may define a colour. `src/lib/email.ts` is the only exception
(mail clients cannot read CSS variables), and `src/lib/design-tokens.ts`
mirrors the CSS on purpose.

Editing `data/theme.json` re-derives every scale — you never edit a hex in
TypeScript to re-theme the store.

## Colour

Each hue has exactly one job.

| Role             | Token                                  | Value     | Use                                                              |
| ---------------- | -------------------------------------- | --------- | ---------------------------------------------------------------- |
| Brand / action   | `--color-brand` (`--purple-600`)       | `#632989` | Primary buttons, prices, selected states, links, focus ring      |
| Deep section     | `--purple-950`                         | `#341648` | Dark panels, chat card                                           |
| Tint             | `--purple-50`                          | `#F6F2F8` | Secondary button hover, quiet backgrounds                        |
| Signature detail | `--brand-gold`                         | `#D4AF37` | Hairlines, ornaments, one element per component                  |
| Gold text        | `--color-gold-text` (`--gold-700`)     | `#836D22` | Gold labels (4.7:1 on `gold-50`, 5.0:1 on white)                 |
| Status           | `--color-positive` (`--green-700`)     | `#497535` | In-stock dot, success text (5.4:1 on white)                      |
| Status tint      | `--green-50`                           | `#F1F9EC` | Positive badge background                                        |
| Danger           | `--color-danger`                       | `#B3261E` | Errors, destructive actions                                      |
| Text             | `--color-text` (`--neutral-800`)       | `#1D1D1F` | Body copy                                                        |
| Muted text       | `--color-text-muted` (`--neutral-500`) | `#5B5B66` | Secondary copy, captions                                         |
| Page             | `--color-bg`                           | `#FBFAF9` | Page background                                                  |
| Surface          | `--color-surface`                      | `#FFFFFF` | Cards, sheets, inputs                                            |
| Muted surface    | `--color-surface-muted`                | `#F5F3F7` | Neutral badges, hover states                                     |
| Hairline         | `--color-border`                       | `#E7E3EC` | Dividers, card edges                                             |
| Control edge     | `--color-border-strong`                | `#8C8499` | Input/checkbox borders (3.7:1 — a visible edge without a shadow) |

Rules:

- **Never** white text on gold or green. Gold and green text only exist as
  `--color-gold-text` and `--color-positive`.
- Purple carries the only filled action on a screen; everything else is
  outline, text or neutral.
- Neutrals are warm and faintly purple-tinted (`--neutral-50 … --neutral-900`).

Measured contrast (WCAG 2.1, default theme):

| Pair                                  | Ratio  |
| ------------------------------------- | ------ |
| Text on page                          | 16.1:1 |
| Text on surface                       | 16.8:1 |
| Muted text on surface                 | 6.7:1  |
| White on brand (primary button)       | 9.5:1  |
| Brand on white (secondary button)     | 9.5:1  |
| Gold text on gold-50 (featured badge) | 4.7:1  |
| Positive text on green-50             | 5.0:1  |
| White on positive (success state)     | 5.4:1  |

The full table (22 pairs) lives at `/dev/design-system` and is asserted by
`src/lib/design-tokens.test.ts`.

## Typography

Cairo, Arabic subset, **three weights only**: 400 / 500 / 700. No
letter-spacing and no uppercase tracking on Arabic. Line heights are tuned for
Arabic: tight for display, generous for body.

| Utility         | Size                        | Line height | Use                                |
| --------------- | --------------------------- | ----------- | ---------------------------------- |
| `text-display`  | `clamp(40px, 5.2vw, 64px)`  | 1.15        | Hero statements                    |
| `text-title-1`  | `clamp(32px, 3.6vw, 48px)`  | 1.25        | Page title                         |
| `text-title-2`  | `clamp(26px, 2.6vw, 32px)`  | 1.25        | Product name on the PDP            |
| `text-title-3`  | `clamp(20px, 2vw, 24px)`    | 1.25        | Section titles, price              |
| `text-headline` | `clamp(18px, 1.5vw, 20px)`  | 1.4         | Card titles                        |
| `text-body`     | `clamp(16px, 1.15vw, 17px)` | 1.7         | Running text                       |
| `text-caption`  | `14px`                      | 1.6         | **The floor.** Labels, chips, meta |

Every surface uses at most seven sizes and three weights. Nothing renders
below 14px — `check:tokens` fails the build if it tries to.

## Spacing, radius, elevation, motion

```
--space-section: clamp(64px, 8vw, 112px)   /* every page section */
--space-1 … --space-16                     /* 4/8 scale              */

--radius-control: 12px   /* buttons, inputs, chips */
--radius-card: 20px      /* cards, sheets, panels  */
--radius-pill: 9999px    /* pills, avatars         */

--shadow-soft:   0 1px 2px … , 0 8px 24px -14px …
--shadow-lifted: 0 18px 48px -18px … , 0 2px 8px …
```

Only three radii and two shadows exist. The stock Tailwind `rounded-*` and
`shadow-*` scales are remapped onto them, so a stray `shadow-xl` or
`rounded-3xl` cannot introduce a fourth value.

Motion uses one curve and three durations: `--ease-apple`
`cubic-bezier(0.28, 0.11, 0.32, 1)` with `--duration-fast` 150ms,
`--duration-base` 300ms, `--duration-slow` 500ms. A global
`prefers-reduced-motion` rule disables decorative animation (marquee, mesh,
shimmer) and collapses transitions.

## Components

### Button (`src/components/ui/button.tsx`)

| Variant            | Look                             | Use                             |
| ------------------ | -------------------------------- | ------------------------------- |
| `primary`          | purple fill, white text, pill    | The one action on a screen      |
| `secondary`        | purple outline, transparent      | The alternative action          |
| `tertiary`         | purple text, no chrome           | Inline "learn more"             |
| `destructive`      | danger fill                      | Irreversible actions            |
| `outline` (legacy) | neutral outline                  | Quantity steppers, dialog close |
| `ghost` (legacy)   | transparent, surface-muted hover | Icon and Chrome controls        |

Sizes: `sm` 40px, `default`/`md` 44px, `lg` 52px, `icon` 44px,
`icon-sm` 40px, `icon-xs` 36px with a transparent 4px bleed (44px target).
Focus ring: 2px purple with a 2px offset on every variant.

### Badge (`src/components/ui/badge.tsx`)

`neutral` (facts, categories), `gold` (the فاخر label), `positive`
(availability), `primary` (purple fill), `destructive`. Badges use
`text-caption` and a pill radius; `gold`/`positive` never use white text.

### Header (`src/features/layout/components/header-bar.tsx`)

A floating glass **capsule**, not a full-width bar: it is inset from the
viewport, sits 12px below the top edge, is 52px tall on phones and 60px from
1024px, fully rounded, with a single 1px gold hairline and `--shadow-soft`.
The page scrolls underneath it.

```
╭──────────────── 12px ────────────────╮
│  ◯ PARFUMS DE FODA   nav        ⌕ 🛒 │  ← capsule, --header-capsule high
╰──────────────────────────────────────╯
   the page runs under it (fixed, z-30)
```

Tokens (declared once in `globals.css`, prefixed `--header-` so `check:tokens`
refuses an undeclared one):

| Token                    | Job                                                     |
| ------------------------ | ------------------------------------------------------- |
| `--header-gap`           | the 12px the capsule floats in                          |
| `--header-capsule`       | 52px / 60px (>= 1024px)                                 |
| `--header-offset`        | gap + capsule — what every page pads its top by         |
| `--header-surface`       | the glass fill (tone-dependent)                         |
| `--header-fg` / `-muted` | text colours for the active tone                        |
| `--header-accent`        | the nav's active underline (tone's accent, never gold)  |
| `--header-field` / `-strong` / `-border` | the search pill on glass                  |
| `--header-hover` / `--header-ring`      | icon-button hover and focus ring          |

**Two tones**, switched by `data-tone` on `<header>`:

| Tone      | Where                                          | Look                                        |
| --------- | ---------------------------------------------- | ------------------------------------------- |
| `dark`    | `/` while the hero is behind the capsule       | white 8% glass + blur, white text           |
| `light`   | every other route, and `/` once the hero left  | ivory 88% glass + blur, `--color-text` text |

The server renders the tone for the route, so the first paint is already
correct. A tiny client island flips it (dark → light) with an
`IntersectionObserver` on the hero's `data-hero-sentinel`; it writes the
attribute onto the element, so scrolling never re-renders the bar.

Fallbacks: `@supports not (backdrop-filter…)` and
`@media (prefers-reduced-transparency: reduce)` both replace the glass with a
solid surface of the same tone, so text contrast never depends on an unknown
backdrop. Contrast pairs for both tones are asserted in
`src/lib/design-tokens.test.ts`.

Hard rules:

- **No imagery.** The brand mark is `/logos/logo.svg` painted as a CSS
  background (an emblem on an ivory seat), so no `<img>` — and therefore no
  product thumbnail — exists anywhere in the header, its menus, its search
  suggestions or the mobile sheet.
- **Gold only as the hairline** (`--ui-gold-hairline` on the capsule edge, plus
the mobile sheet's item hairlines). No gold text, no gold fill.
- **Search is text-only.** Suggestions are name + public meta; the index is
  fetched lazily on first focus and never enters a client bundle.
- **Smart hide** lives in `data-hidden` (rAF-throttled scroll listener); it
  never hides at the top, while search/dropdown/sheet is open, while focus is
  inside, or under reduced motion.

**Page offsets.** `main` carries `pt-[var(--header-offset)]`; the homepage hero
cancels it with `-mt-[var(--header-offset)]` so it runs under the capsule, and
adds the offset back as top padding so the headline and CTAs are never covered.
`html { scroll-padding-top }` keeps anchors below the capsule.

### Stacking order

One ladder, referenced by every component that floats:

| z     | Layer                                                              |
| ----- | ------------------------------------------------------------------ |
| 10–20 | decoration inside a component (hero plates, card stage, quick add) |
| 30    | the floating header; checkout's mobile sticky submit bar           |
| 40    | PDP sticky buy bar, the advisor bubble                             |
| 50    | every modal: cart drawer, zoom dialog, filter sheet, size chooser, houses popover, search list, toasts |
| 9999  | the skip link (must beat everything while focused)                 |

The header is therefore **below** every modal, the PDP buy bar and the
advisor bubble; nothing may be added between 30 and 40 that a modal would have
to fight.

## Catalogue

### Product card (`src/features/products/components/product-card.tsx`)

A Server Component: it ships HTML with no JavaScript of its own. The only
client code is the quick-add island, and the size chooser is a separate chunk
loaded the first time a shopper opens it.

```
┌───────────────────────────────────┐
│                         [badge]   │   stage: 4:5, --color-surface-muted,
│            image                  │   soft ground shadow, radius-card
│                                   │
│  (+)                              │   quick add: 44px, brand purple,
└───────────────────────────────────┘   inline-start, bottom
  نيش · شرقي                            meta: caption, muted, max 3 parts
  أفريكان ليذر                          name: headline, 700, 2 lines max
  من ١٢٠ ج.م                            price: body, 700, brand purple
```

Rules:

- **One badge, by priority:** coming soon > out of stock > فاخر (gold) > none.
  A normal, in-stock product carries no badge at all.
- **Price** is the cheapest buyable size, prefixed with «من» only when the
  product has more than one size. A sold-out product still states its cheapest
  listed price (no pressure, nothing to add).
- **Meta** is the public tier label, the scent style, then the concentration —
  each only when the catalogue has it. `دووب` has no public label: see
  `PUBLIC_TIER_LABELS` in `src/lib/product-labels.ts`, the one lookup that
  decides whether a tier may be shown. Filters build their options from the
  same map, so a dupe is never labelled as one anywhere a shopper looks.
- **Quick add** adds straight away when exactly one size is buyable, opens a
  chooser (popover on desktop, bottom sheet on mobile) when several are, and
  does not exist when none are. It is always visible on touch and revealed on
  hover/focus on pointer devices.
- **States** come from data, never from a badge string: photo pending (shared
  placeholder → a quiet «قريبًا» stage, no price, no controls), sold out
  (image at 60%, muted name, no quick add), missing image (the stage stays, the
  broken icon goes), long names (2-line clamp).
- **Motion** is transform-only: a 1.03 image scale over 500ms `--ease-apple`.
  The global `prefers-reduced-motion` rule disables it.
- Cards after the first row carry `content-visibility: auto` with
  `contain-intrinsic-size`, so off-screen cards cost no layout work.

### Filters, sort and search (`src/features/catalog`, `src/lib/catalog-*.ts`)

The query string is the single source of truth. The server reads it, filters
and counts the catalogue, and renders the grid; the controls only rewrite it
with `router.replace(..., { scroll: false })`.

| Param         | Values                                                          |
| ------------- | --------------------------------------------------------------- |
| `gender`      | `رجالي`, `نسائي`, `للجنسين` (comma-separated)                   |
| `style`       | `شرقي`, `غربي`                                                  |
| `tier`        | `ديزاينر`, `نيش` — never `دووب`                                 |
| `performance` | `أداء ضعيف`, `أداء متوسط`, `أداء قوي`, `أداء صاروخي`            |
| `price`       | `up-to-120`, `121-to-150`, `over-150`                           |
| `available`   | `1`                                                             |
| `sort`        | `featured` (default), `price-asc`, `price-desc`, `alphabetical` |
| `q`           | the search query, trimmed to 80 characters                      |

An unknown value is ignored, so a hand-edited URL cannot produce a broken
view. Defaults are omitted from the URL, and the key order is fixed.

**`season` is not a filter.** It stays optional product data (the PDP's
"الفصل والأداء" row still shows it), but the catalogue offers no الفصل facet, no
chip and no count. A legacy link such as `/shop?season=شتوي` loads normally, the
parameter is dropped silently, and it never appears in a canonical URL or a
generated link.

- **Facet counts** are computed against the _other_ active filters (never the
  group's own), so a count answers "what would adding this show?". Options that
  exist in the catalogue stay visible with a zero count and are disabled; an
  option no product uses is not offered at all.
- **Price bands** describe the cheapest buyable size. Their boundaries come
  from the data, not from round numbers: the catalogue's entry prices are 120,
  150, 180 and 220 EGP, so 120 and 150 are the only cuts that separate real
  groups. The catalogue currently clusters at 120 (26 products), which the facet
  counts show honestly.
- **Ordering** is availability first: buyable, then sold out, then coming soon,
  stable inside each group. The chosen sort decides everything else.
- **Layout**: 2 columns below 640px (12px gap), 3 columns to 1279px, 4 columns
  from 1280px (24px gap). Laptop gets a bar of pill triggers with popovers; below
  1024px a single "الفلاتر" button opens a full-height bottom sheet with the same
  groups and a live "عرض N منتج". Closing the sheet returns focus to its trigger.
- The result count is an `aria-live="polite"` region; every checkbox, chip and
  toggle has an Arabic accessible name.

## Reference page

`/dev/design-system` renders every token, the contrast table, the type scale,
all buttons and badges, form controls, radii and shadows. It returns
`notFound()` when `NODE_ENV === "production"`, so it exists only during
development.
