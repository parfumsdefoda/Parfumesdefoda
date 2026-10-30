# Testing — Parfums De Foda

What runs, what it proves, and how to run it by hand. Commands are the ones in
`package.json`; nothing here needs an extra tool beyond Playwright's Chromium
and Lighthouse (both dev dependencies / `npx`).

## The gate

Run in this order. Each step is independent, so a failure is attributable:

```bash
npm run validate-json   # all JSON + the zod Product schema
npm run check:tokens    # no raw hex, no arbitrary shadows, no sub-14px text
npm run check:derived   # every visible product image has its derivative tiers
npm run typecheck       # tsc --noEmit (strict)
npm run lint            # eslint
npm run test            # vitest (unit + API routes)
npm run build           # production build (Turbopack)
npm run check:links     # internal links resolve against the built app
PERF_BASE_URL=http://127.0.0.1:3227 npm run perf:budget  # first-load JS
```

`npm run build` runs `prebuild` (the derivative check) first, so a build with a
missing derivative for a **visible** product cannot succeed.

### Safety rule for every local run

Any run that can reach checkout — unit tests, E2E, a manual poke — must use the
log channel, with the channel keys blanked:

```bash
ORDER_CHANNELS_MODE=log RESEND_API_KEY= OWNER_EMAIL= RESEND_FROM_EMAIL= OPENAI_API_KEY= npm test
```

`log` writes the exact email/WhatsApp payload to `.tmp/order-previews/` and
contacts nobody; blank keys mean even a live path has nothing to send with.
Both are refused in production (`resolveOrderChannelMode()` in
`src/lib/order-channels.ts`), so a deployed store can never be silenced by an
environment variable.

## Unit tests (`npm test`, vitest)

Pure logic lives beside the code it tests (`src/lib/*.test.ts`,
`src/features/*/*.test.ts`) plus the API routes
(`src/app/api/orders/route.test.ts`, `src/app/api/chat/route.test.ts`).
Covered areas:

- catalogue query parsing/serialising and facet counting (`catalog-*.test.ts`)
- card presentation: badge priority, premium frame, meta line, price
  (`card-presentation.test.ts`)
- product data: enrichment, master import/export, schema (`product-*.test.ts`)
- pricing, shipping (flat 100 EGP), order numbers, order payloads
  (`order-*.test.ts`, `shipping.test.ts`)
- design tokens: the full contrast table (`design-tokens.test.ts`)
- AI provider and grounding, rate limiter, request origin

## End-to-end (`npm run e2e`, Playwright)

The suite runs against a **production build** on `127.0.0.1:3227`; the config
starts it (`webServer`) unless one is already listening and `CI` is unset.
Projects: `chromium-desktop` (1440×900) and `chromium-mobile` (375×812, Pixel 7
device profile). `reducedMotion: "reduce"` is global — tests that are *about*
motion opt back in with `page.emulateMedia`.

| Spec | Proves |
| ---- | ------ |
| `e2e/storefront.spec.ts` | the shopper's path end to end: browse → filter → add → drawer → checkout → success, no-JS render, whole-site axe, security/SEO surfaces |
| `e2e/header.spec.ts` | the floating capsule: both tones (server HTML and after scrolling past the hero), smart hide, search combobox keyboard flow, mobile sheet focus trap + Escape + focus return, no `<img>` in the header, no horizontal overflow at 375/768/1024/1440, CLS ≤ 0.01, reduced-transparency fallback |
| `e2e/premium-card.spec.ts` | the premium frame: helper, badge priority, meta line, alpha-gated dark stage, equal card height in a row, reduced motion, gold-on-ivory contrast |
| `e2e/ui-luxury-a11y.spec.ts` | axe over the new states: dark and light header, premium PDP stage, mobile sheet, open search suggestions, mobile toolbar |

```bash
# everything, once
npx playwright test --project=chromium-desktop --project=chromium-mobile

# one spec, visible, with a trace
npx playwright test e2e/header.spec.ts --project=chromium-desktop --headed

# re-baseline the visual snapshots after an intentional change
npm run e2e:update
```

Visual baselines live in `e2e/__screenshots__/{projectName}/` and are tracked;
`playwright-report/` and `playwright-results/` are not.

### Flakiness policy

A spec that fails once and passes on retry is a bug in the spec or in the
product, not something to retry away. When the harness has to wait for the
browser to catch up (CDP media emulation, a scroll-driven animation landing),
poll the observable state with `expect.poll` — never lengthen the assertion or
loosen it.

## Visual verification

Screenshots are evidence, not artefacts in the repo (`.audit/` is scratch). The
ui-luxury pass produced them with `.measure/ui-luxury-shots.mjs`:

```bash
# production build on :3227 for real routes
npx next start --hostname 127.0.0.1 --port 3227
# next dev on :3230 for /dev/product-card and /dev/design-system (404 in prod)
npx next dev --hostname 127.0.0.1 --port 3230

node .measure/ui-luxury-shots.mjs all      # or: u4 | u5
```

Widths used: 375, 768, 1024, 1440. Every state that can shift on a breakpoint
(header tone, mobile sheet, card hover/focus, PDP stage) is captured at least at
375 and 1440.

## Performance

```bash
# first-load JS per route against the budget (Brotli), needs a server on :3227
PERF_BASE_URL=http://127.0.0.1:3227 npm run perf:budget
```

Budgets: 240 KiB on `/`, `/shop`, category pages, PDPs and `/cart`; 260 KiB on
`/checkout`. The script prints the table and exits non-zero over budget.

Lighthouse is run by hand (mobile emulation, median of three):

```bash
for i in 1 2 3; do
  npx --no-install lighthouse http://127.0.0.1:3227/shop \
    --output=json --output-path=.qa/lh-ui/shop-$i.json \
    --only-categories=performance,accessibility --quiet \
    --chrome-flags="--headless=new --no-sandbox"
done
```

`.qa/lcp.mjs` reports the LCP candidate, its element and the paint sub-parts
under DevTools-style throttling (slow 4G + 4× CPU), which is what explains a
score rather than restating it.

## Not covered locally

These need the real deployment and stay on the launch checklist:

- real email (Resend) and WhatsApp (CallMeBot) delivery
- TLS/HSTS and the security headers as served by the proxy
- the 308 redirects at the edge, custom domain and DNS
- field performance (CrUX) and real devices
- the AI advisor with a funded key (local runs use the deterministic fallback)
