# Atelier Lab — a luxury storefront design system

A standalone, dependency-free implementation of the reference luxury-perfume
design language (Amouage-style restraint): collection page, product page,
header/footer, cart drawer, four palettes, three type pairings and three motion
levels.

It lives beside the shop, not inside it. Nothing here imports the Next.js app,
touches its data, or changes its build — the lab is plain HTML/CSS/JS so it can
be read, forked or lifted into any framework.

```
amouage-lab/
├── server.mjs                 preview server (serves the repo root, no deps)
├── index.html                 collection page (filters, sort, grid)
├── product.html               product page (gallery, engraving, related)
└── assets/
    ├── css/
    │   ├── tokens.css         ← every colour, font, space, duration
    │   ├── base.css           reset, type, buttons, reveals, skeletons
    │   ├── layout.css         header, mega menu, cart drawer, footer, atelier
    │   ├── catalog.css        masthead, filters, cards, related rail
    │   └── product.css        gallery zoom, variants, accordions, gift panel
    └── js/
        ├── catalog-data.js    12 products (the data contract)
        ├── shell.js           theme, header, menus, cart store, toasts, reveal
        ├── catalog.js         URL-driven filtering + sorting + rendering
        └── product.js         PDP rendering and interaction
```

## Run it

```bash
node amouage-lab/server.mjs
# → http://127.0.0.1:4400/amouage-lab/
```

The server serves the repository root so the pages can use the shop's real
bottle photography (`/public/products/derived/<slug>/…`, AVIF + WebP). Any other
static server works as long as it is rooted at the repo.

## 1. Swapping the palette

Every colour is a custom property in `tokens.css`. Four palettes ship:

| Attribute | Character |
| --- | --- |
| `data-palette="noir-or"` | deep black + warm gold (default) |
| `data-palette="ivoire-or"` | ivory paper + gold |
| `data-palette="bleu-froid"` | ink blue + pale silver |
| `data-palette="monochrome"` | graphite + bone |

Set it once on the document, or per section:

```html
<html data-palette="ivoire-or">
<section data-palette="monochrome"> … </section>
```

To make your own, copy a block in `tokens.css` and keep the same 20 variables:

```css
[data-palette="rose-or"] {
  color-scheme: dark;
  --c-canvas: #140d10;      /* page background                    */
  --c-surface: #1b1116;     /* cards, drawer, footer              */
  --c-surface-2: #23161c;
  --c-surface-3: #2c1b23;
  --c-ink: #f2e8e6;         /* primary text                       */
  --c-ink-soft: #d9c8c6;
  --c-ink-muted: #a08b8c;
  --c-line: rgb(242 232 230 / .14);
  --c-line-strong: rgb(242 232 230 / .28);
  --c-accent: #c98f88;      /* CTAs, focus, gold role             */
  --c-accent-strong: #e2aca4;
  --c-accent-ink: #140d10;  /* text on the accent                 */
  --c-accent-soft: rgb(201 143 136 / .28);
  --c-accent-tint: rgb(201 143 136 / .08);
  --c-price: #dcb0a8;
  --c-badge-bg: #f2e8e6;
  --c-badge-ink: #140d10;
  --c-soldout: #a8a8a8;
  --c-soldout-bg: rgb(20 13 16 / .72);
  --c-danger: #c07a72;
  --c-overlay: rgb(10 6 8 / .72);
  --c-header-veil: rgb(20 13 16 / .86);
  --c-header-solid: #140d10;
  --c-focus: #e2aca4;
  --c-stage-1: #221519;     /* product stage gradient start        */
  --c-stage-2: #120c0e;
  --c-stage-alt-1: #2c1b21; /* second (hover) stage                */
  --c-stage-alt-2: #150e11;
  --c-stage-ink: #f2e8e6;
}
```

The atelier panel (bottom-left) switches palettes live and remembers the choice
in `localStorage`. It is a preview tool — delete the `.atelier` markup for
production.

**Rules that keep a palette readable:** `--c-accent` must reach 3:1 against
`--c-canvas` for text; `--c-accent-ink` must reach 4.5:1 against `--c-accent`
(it is text on the button). Photographs sit on `--c-stage-*`, never on the
accent.

## 2. Swapping the type

```css
--font-display: "Playfair Display", "Didot", serif;   /* titles, names    */
--font-editorial: var(--font-display);                /* wordmark         */
--font-sans: "Inter", "Helvetica Neue", Arial, sans-serif; /* body, UI    */
```

`data-serif="playfair | cormorant | bodoni"` switches the display face; the lab
requests all three from Google Fonts with `display=swap` and every stack
degrades to a system serif offline. Sizes are fluid (`clamp()`) tokens — change
`--fs-display` to re-scale the collection title, not the individual rules.

## 3. Swapping the motion

```css
--dur-fast: 180ms;  --dur-base: 320ms;  --dur-slow: 560ms;  --dur-image: 400ms;
--ease-lux: cubic-bezier(.22,.61,.36,1);
--hover-scale: 1.02;  --press-scale: .98;  --reveal-y: 18px;  --stagger: 70ms;
```

`data-motion="none | subtle | moderate"` rewrites those tokens, so one attribute
turns every animation down or off. `prefers-reduced-motion: reduce` overrides
all three. Only `transform` and `opacity` animate (plus colour/border), so the
compositor does the work. Scroll reveals use one `IntersectionObserver`; nothing
listens to scroll except the header state, and it is `{ passive: true }`.

## 4. Using your own product data

`assets/js/catalog-data.js` is the whole contract:

```js
{
  slug: "pf020", name: "Nocturne Leather", collection: "Cuir",
  family: "Leather", gender: "For All", price: 180, currency: "USD",
  sizes: [{ label: "50 ml", price: 180, soldOut: false }],
  notes: { top: [], heart: [], base: [] },
  image: { base: "/public/products/derived/pf020" },  // no size/extension
  isNew: true, soldOut: false,
  description: "…", ingredients: "…", tags: ["leather", "oud"]
}
```

`image.base` is expanded to `card-400|800` and `pdp-1200` in AVIF and WebP. Point
it at your CDN and the `<picture>` elements follow. Nothing else needs editing:
the grid, filters, facet counts, related rail and JSON-LD are all derived from
this array.

## 5. What is implemented, and where

| Requirement | Where |
| --- | --- |
| Transparent → solid sticky header, hide-on-scroll-down | `layout.css` `.site-header`, `shell.js` `wireHeader` |
| Mega menu (4 columns + editorial card), hover intent + Esc | `.mega`, `wireMega` |
| Secondary nav, breadcrumbs, centred serif collection title | `catalog.css`, `index.html` |
| 3 → 2 → 1 grid, dual-image crossfade, NEW badge, gold border, 1.02 scale | `.card`, `.card__layer--alt` |
| Filter rail: accordions, gold checks, price range, scent pills | `.facet`, `.check`, `catalog.js` |
| URL state (`?gender=&family=&scent=&q=&sort=&min=&max=`) | `catalog.js` `syncUrl` |
| Gallery: thumbnails, hover zoom, touch swipe | `product.js` `renderGallery` |
| Variants with live price, wishlist, stock note | `renderVariants`, `renderPrice` |
| Accordions: composition, notes pyramid, ingredients, shipping | `.acc`, `wireAccordions` |
| Gift panel: wrap swatches, engraving + counter + style + colour + confirm | `.gift`, `wireGift` |
| Live engraving preview | `[data-engrave-preview]` |
| Related products rail (arrows + scroll-snap) | `renderRelated` |
| Cart drawer, localStorage, quantity, subtotal, badge | `shell.js` `CART` |
| Skeleton grid with `aria-busy`, never a spinner | `.skeleton`, `catalog.js` |
| Scroll reveals, staggered, reduced-motion aware | `.reveal`, `wireReveal` |
| Sticky mobile buy bar | `.buy-bar`, `wireBuyBar` |
| Full-screen mobile menu | `.mobile-menu`, `wireMobileMenu` |
| Footer: 5 columns, newsletter, payment marks, socials | `index.html` |
| JSON-LD (`Product`, `CollectionPage`), semantic landmarks | `index.html`, `product.js` |
| Focus rings, skip link, trap + restore focus in every overlay | `base.css`, `shell.js` |

### Accessibility notes

- Every overlay (mega menu, search, cart, mobile menu, filter sheet) traps Tab,
  closes on Escape and returns focus to its trigger.
- The cart count and result count are `aria-live` regions; the drawer body is a
  `role="dialog" aria-modal="true"` region.
- Tap targets are ≥44 px; the grid keeps 4:5 image stages so nothing reflows
  when images land.
- Motion is opt-out twice over: the intensity switch and `prefers-reduced-motion`.

### Known demo shortcuts

- The gallery shows three framings of the same bottle (full, closer, warm light)
  because the source photography is one angle. Swap `slides` in `renderGallery`
  for real multi-angle shots.
- Hover shows the same photograph on a warmer stage rather than a true lifestyle
  image — the second `<picture>` is already there; point it at your asset.
- The newsletter form and "Proceed to checkout" are inert; there is no backend.
- Payment marks are drawn as neutral outlines; replace them with your
  provider's official assets before launch.
