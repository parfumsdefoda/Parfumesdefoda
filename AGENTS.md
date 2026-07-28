# AGENTS.md — Parfums De Foda

Arabic perfume e-commerce. Next.js 16 (Turbopack), App Router, Tailwind CSS v4, Shadcn/UI (base-nova style), Framer Motion, React Hook Form + Zod v4, Lucide React.

## First Reads

1. `data/settings.json` — store config (currency, grid: 3/2/1, shipping: 60 EGP, free above 500)
2. `data/theme.json` — design tokens (colors, spacing, shadows)
3. `data/products.json` — product catalog (array of 4 products, sizes: 50/30/2.5 مللى)
4. `locales/ar.json` — all user-facing Arabic text (with fallback defaults in components)
5. `data/contact.json` — WhatsApp number + email for orders
6. `content/faq.json`, `content/policies.json` — page content

## Commands

```
npm run validate-json   # validates all 18 JSON files (scripts/validate-json.js — CommonJS)
npm run typecheck       # tsc --noEmit (strict)
npm run lint            # ESLint (scripts/ is ignored — uses require())
npm run test            # vitest run (41 tests in src/lib/*.test.ts)
npm run build           # production build (Turbopack)
```

**Verification order:** `validate-json -> typecheck -> lint -> test -> build`

## Architecture

- **Homepage** (`/`) is the main storefront: search, filters, product grid, FAQ, policies, contact, cart drawer. Cart is a Shadcn Sheet drawer (right side).
- **Checkout** is a separate route: `/checkout` (two-column: form + order summary) → `/checkout/success` (order confirmation).
- **API Route** `/api/orders` — receives order objects (in-memory storage, prepare for future DB).
- **Feature-based** (`src/features/{name}/components/`, `hooks/`, `types/`, `utils/`). Each feature has a barrel `index.ts` export.
- **No accounts, no payment.** Guest checkout only. Orders go via WhatsApp + Email.
- **4 clicks max** from landing to order submission (browse → add to cart → cart drawer → checkout → submit).
- **Static output.** All routes pre-rendered at build time except `/api/orders`.

## Data Loading (Critical — read before touching any service)

**All JSON is loaded server-side via `node:fs/promises`.** Services use `readJsonFile()` from `src/lib/json-loader.ts`, which reads from project root (`process.cwd()` + relative path).

Data flow:
```
JSON files (data/, content/, locales/) → readJsonFile() → load*() services → Server Component (page.tsx) → Props → Client Component (HomePageClient) → Hooks → UI
```

- `page.tsx` (homepage) and `checkout/page.tsx` are **Server Components** that call `loadProducts()`, `loadFullSettings()`, `loadFilterData()`, `loadContent()`, `loadLocale()` in parallel via `Promise.all()`.
- `layout.tsx` loads theme server-side via `loadTheme()` and passes to `<Providers theme={theme}>`.
- Client hooks (`useProducts`, `useSettings`, etc.) receive pre-loaded data as props — they do **not** fetch.
- **Never use `fetch()` for local JSON files.**

### Server/Client Type Boundary (Turbopack trap)

Client components must **never import types from service files** (e.g., `@/services/settings`). Even `import type` causes Turbopack to trace through `node:fs/promises` into the client bundle, which breaks the build.

- **Client-safe types:** `src/types/services.ts` (FullSettings, FilterData, SiteContent, Theme, LocaleMessages, etc.)
- **Pure utility functions:** `src/lib/locale.ts` (the `t()` translation function — no server deps)
- **Server-only:** `src/services/*.ts`, `src/lib/json-loader.ts` — these import `node:fs` and must never be referenced (even via `import type`) from `"use client"` components.

## Data Rules

- **All user-facing text** in `locales/ar.json`. Component props have Arabic defaults (matching locale keys), but `page.tsx` resolves text via `t()` at runtime.
- **All store data** in `data/` (products, settings, theme, contact, etc.) and `content/`. Never hardcode prices, colors, contact info.
- **Owner edits JSON files** to manage the site. Never require editing TypeScript for common tasks.
- **Product sizes** — Only three allowed: `50 مللى`, `30 مللى`, `2.5 مللى`. No other sizes.
- **`products.json` format:** Always an array `[{...}, {...}]`.
- **`FullSettings` type** includes `shipping: { cost: number; freeAbove?: number }` — always load from settings, never hardcode shipping.
- **Default values** in `src/services/settings.ts` and `src/hooks/use-settings.ts` must match `data/settings.json`.

## Key Constraints

- **No loading spinners** — always skeleton placeholders (`src/app/loading.tsx` has the pattern, uses `aria-busy="true"`).
- **No account creation** — guest checkout only.
- **No online payment** — orders go via WhatsApp + Email.
- **4 clicks max** from landing to order submission.
- **Filters update instantly** — no "Apply" button on desktop.
- **Size selector updates price instantly** — no page reload.
- **Arabic-first, RTL.** `lang="ar" dir="rtl"` on `<html>`. Use logical CSS properties (`ms-`/`me-` not `ml-`/`mr-`).
- **Accessibility** — skip-to-content link, `aria-busy` on loading, `role="alert"` on error boundary, `focus-visible` ring styles on all interactive elements.
- **Header behavior** — Desktop: hides on scroll down, shows on scroll up, shows when mouse nears top 20px. Mobile: always visible.

## Provider Order (src/app/providers.tsx)

```
ThemeProvider → CartProvider → ToastProvider → children
```

- `ThemeProvider` receives `initialTheme` prop (pre-loaded by `layout.tsx`), injects CSS variables on `:root` via `useEffect`.
- `CartProvider` initializes with `[]` (matching server render) and hydrates from localStorage in `useEffect` — prevents hydration mismatch.
- `ToastProvider` manages toast notifications (`useToast()` hook — `showToast(message, type?)`).

## Key Technical Details

- **Shadcn base-nova style** — components use `@base-ui/react` (not Radix). Button supports `render` prop for composition: `<Button render={<Link href="/" />}>`. Use this instead of wrapping buttons in links.
- **Button default variant** — green (`--color-secondary`) with purple hover (`--color-accent`). Not white.
- **`formatPrice()`** (`src/lib/currency.ts`) — uses `toLocaleString("ar-EG")`, produces Arabic-Indic numerals (١٬٢٠٠ ج.م).
- **Order numbers** — format `PDF-YYYYMMDD-NNNNN` (e.g. `PDF-20260716-00125`), generated client-side by `src/lib/order-number.ts` using localStorage daily counter.
- **Checkout form** — Only 3 fields: name, phone, address. Schema in `src/schemas/checkout.ts`.
- **JSON-LD** structured data (Organization, WebSite, Store schemas) injected in `layout.tsx` `<head>`.
- **Security headers** applied via `next.config.ts` — X-Content-Type-Options, X-Frame-Options, HSTS, etc.
- **Caching** — `/logos/` immutable. No more `/data/` or `/content/` HTTP caching headers (data is loaded from filesystem, not HTTP).
- **`error.tsx` and `not-found.tsx`** render outside Provider tree — cannot use hooks. Hardcoded Arabic is intentional there.
- **`robots.txt` and `sitemap.xml`** in `public/` (not generated by Next.js).
- **`json-loader.ts`** uses `/* turbopackIgnore: true */` on `process.cwd()` to suppress NFT trace warnings. Do not remove this comment.
- **Product type** — `Product.notes` is `ProductNotes { top?: string[], middle?: string[], base?: string[] }` (not a flat string array). `Product.type` is `"normal" | "niche" | "gold"`.
- **Product card** — Shows category badge, name, "وصف المنتج" title, short description (2 lines), size selector (single row), price, add-to-cart button.

## Shadcn Components Installed

Button, Sheet, Accordion, Input, Checkbox, Badge, Label, Separator, Skeleton, Dialog

## Never

- Hardcode Arabic text (use `locales/ar.json`; exceptions: error/not-found pages outside Provider tree)
- Hardcode colors/prices/contact/shipping (use `data/` JSON)
- Use loading spinners (use skeleton placeholders with `aria-busy`)
- Require account creation or page reload for filters/size/cart
- Break RTL (use logical CSS properties)
- Add features not in the product model without updating `data/` first
- Use `<a>` to wrap `<Button>` for navigation (use `render` prop instead)
- Import types from `src/services/*` in `"use client"` components (use `src/types/services.ts` instead)
- Use `fetch()` for local JSON files (use `readJsonFile()` from `src/lib/json-loader.ts`)
- Remove the `/* turbopackIgnore: true */` comment from `json-loader.ts`
- Use `z.string().optional().default("")` in Zod schemas (causes resolver type mismatch with react-hook-form — use `z.string().default("")` instead)
- Add product sizes other than 50 مللى, 30 مللى, 2.5 مللى
