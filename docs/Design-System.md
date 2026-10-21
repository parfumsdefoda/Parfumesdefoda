# Design System — Parfums De Foda

One visual language: warm neutrals, purple for brand and action, gold as a
signature detail, green for status. Restraint over decoration — one chromatic
accent per component, hairlines instead of boxes, and motion that never draws
attention to itself.

## Where the tokens live

| Layer | File | Notes |
| --- | --- | --- |
| Tokens | `src/app/globals.css` | The only place colours, radii, shadows, motion and the type scale are declared. |
| Brand inputs | `data/theme.json` | `colors.accent → --brand-purple`, `colors.gold → --brand-gold`, `colors.secondary → --brand-green`, `colors.primary → --brand-white`. |
| Injection | `src/app/layout.tsx` | The four brand values are written as an inline style on `<html>` during the **server** render, so no palette flash after hydration. |
| Contrast mirror | `src/lib/design-tokens.ts` | Reproduces the CSS derivations in TypeScript so the dev page and the test can measure real ratios. |
| Guard | `npm run check:tokens` | Fails on raw hex, arbitrary `shadow-[…]`, sub-14px text, or an undeclared `var(--token)`. |

Nothing else may define a colour. `src/lib/email.ts` is the only exception
(mail clients cannot read CSS variables), and `src/lib/design-tokens.ts`
mirrors the CSS on purpose.

Editing `data/theme.json` re-derives every scale — you never edit a hex in
TypeScript to re-theme the store.

## Colour

Each hue has exactly one job.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Brand / action | `--color-brand` (`--purple-600`) | `#632989` | Primary buttons, prices, selected states, links, focus ring |
| Deep section | `--purple-950` | `#341648` | Dark panels, chat card |
| Tint | `--purple-50` | `#F6F2F8` | Secondary button hover, quiet backgrounds |
| Signature detail | `--brand-gold` | `#D4AF37` | Hairlines, ornaments, one element per component |
| Gold text | `--color-gold-text` (`--gold-700`) | `#836D22` | Gold labels (4.7:1 on `gold-50`, 5.0:1 on white) |
| Status | `--color-positive` (`--green-700`) | `#497535` | In-stock dot, success text (5.4:1 on white) |
| Status tint | `--green-50` | `#F1F9EC` | Positive badge background |
| Danger | `--color-danger` | `#B3261E` | Errors, destructive actions |
| Text | `--color-text` (`--neutral-800`) | `#1D1D1F` | Body copy |
| Muted text | `--color-text-muted` (`--neutral-500`) | `#5B5B66` | Secondary copy, captions |
| Page | `--color-bg` | `#FBFAF9` | Page background |
| Surface | `--color-surface` | `#FFFFFF` | Cards, sheets, inputs |
| Muted surface | `--color-surface-muted` | `#F5F3F7` | Neutral badges, hover states |
| Hairline | `--color-border` | `#E7E3EC` | Dividers, card edges |
| Control edge | `--color-border-strong` | `#8C8499` | Input/checkbox borders (3.7:1 — a visible edge without a shadow) |

Rules:

- **Never** white text on gold or green. Gold and green text only exist as
  `--color-gold-text` and `--color-positive`.
- Purple carries the only filled action on a screen; everything else is
  outline, text or neutral.
- Neutrals are warm and faintly purple-tinted (`--neutral-50 … --neutral-900`).

Measured contrast (WCAG 2.1, default theme):

| Pair | Ratio |
| --- | --- |
| Text on page | 16.1:1 |
| Text on surface | 16.8:1 |
| Muted text on surface | 6.7:1 |
| White on brand (primary button) | 9.5:1 |
| Brand on white (secondary button) | 9.5:1 |
| Gold text on gold-50 (featured badge) | 4.7:1 |
| Positive text on green-50 | 5.0:1 |
| White on positive (success state) | 5.4:1 |

The full table (22 pairs) lives at `/dev/design-system` and is asserted by
`src/lib/design-tokens.test.ts`.

## Typography

Cairo, Arabic subset, **three weights only**: 400 / 500 / 700. No
letter-spacing and no uppercase tracking on Arabic. Line heights are tuned for
Arabic: tight for display, generous for body.

| Utility | Size | Line height | Use |
| --- | --- | --- | --- |
| `text-display` | `clamp(40px, 5.2vw, 64px)` | 1.15 | Hero statements |
| `text-title-1` | `clamp(32px, 3.6vw, 48px)` | 1.25 | Page title |
| `text-title-2` | `clamp(26px, 2.6vw, 32px)` | 1.25 | Product name on the PDP |
| `text-title-3` | `clamp(20px, 2vw, 24px)` | 1.25 | Section titles, price |
| `text-headline` | `clamp(18px, 1.5vw, 20px)` | 1.4 | Card titles |
| `text-body` | `clamp(16px, 1.15vw, 17px)` | 1.7 | Running text |
| `text-caption` | `14px` | 1.6 | **The floor.** Labels, chips, meta |

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

| Variant | Look | Use |
| --- | --- | --- |
| `primary` | purple fill, white text, pill | The one action on a screen |
| `secondary` | purple outline, transparent | The alternative action |
| `tertiary` | purple text, no chrome | Inline "learn more" |
| `destructive` | danger fill | Irreversible actions |
| `outline` (legacy) | neutral outline | Quantity steppers, dialog close |
| `ghost` (legacy) | transparent, surface-muted hover | Icon and Chrome controls |

Sizes: `sm` 40px, `default`/`md` 44px, `lg` 52px, `icon` 44px,
`icon-sm` 40px, `icon-xs` 36px with a transparent 4px bleed (44px target).
Focus ring: 2px purple with a 2px offset on every variant.

### Badge (`src/components/ui/badge.tsx`)

`neutral` (facts, categories), `gold` (the فاخر label), `positive`
(availability), `primary` (purple fill), `destructive`. Badges use
`text-caption` and a pill radius; `gold`/`positive` never use white text.

## Reference page

`/dev/design-system` renders every token, the contrast table, the type scale,
all buttons and badges, form controls, radii and shadows. It returns
`notFound()` when `NODE_ENV === "production"`, so it exists only during
development.
