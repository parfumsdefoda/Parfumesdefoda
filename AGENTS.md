# AGENTS.md — Parfums De Foda

Arabic perfume e-commerce. Next.js 16 (Turbopack), App Router, Tailwind CSS v4, Shadcn/UI (base-nova style), Framer Motion, React Hook Form + Zod v4, Lucide React.

## First Reads

1. `data/settings.json` — store config (currency, grid: 3/2/1, flat shipping: 100 EGP, no free-shipping threshold)
2. `data/theme.json` — brand colours, injected server-side (see `docs/Design-System.md`)
3. `data/products.json` — product catalog (array of 40 products, sizes: `10 مل`, `30 مل`, `50 مل`, `100 مل`)
4. `locales/ar.json` — all user-facing Arabic text (with fallback defaults in components)
5. `data/contact.json` — WhatsApp number + email for orders
6. `content/faq.json`, `content/policies.json` — page content

## Commands

```
npm run validate-json   # validates all 18 JSON files (scripts/validate-json.js — CommonJS)
npm run validate-products  # Zod schema check on data/products.json (src/schemas/product-schema.ts)
npm run typecheck       # tsc --noEmit (strict)
npm run lint            # ESLint (scripts/ is ignored — uses require())
npm run test            # vitest run (200 tests across src/lib/*.test.ts + services + API routes)
npm run check:tokens    # design-token guard: raw hex, arbitrary shadows, sub-14px text, undeclared var(--token)
npm run build           # production build (Turbopack)
```

**Verification order:** `validate-json -> check:tokens -> typecheck -> lint -> test -> build`

## Architecture

- **Homepage** (`/`) is the main storefront: search, filters, product grid, FAQ, policies, contact, cart drawer. Cart is a Shadcn Sheet drawer (right side).
- **Checkout** is a separate route: `/checkout` (two-column: form + order summary) → `/checkout/success` (order confirmation).
- **API Route** `/api/orders` — receives order objects (in-memory storage, prepare for future DB).
- **Feature-based** (`src/features/{name}/components/`, `hooks/`, `types/`, `utils/`). Each feature has a barrel `index.ts` export.
- **No accounts, no payment.** Guest checkout only. Orders go via WhatsApp + Email.
- **4 clicks max** from landing to order submission (browse → add to cart → cart drawer → checkout → submit).
- **Rendering.** Product pages (`/product/[slug]`, 40 of them), `/checkout`, `/checkout/success`, `/robots.txt` and `/sitemap.xml` are pre-rendered. `/` is server-rendered per request (it fetches live sales counts with `no-store`), and every route handler (`/api/orders`, `/api/chat`) is dynamic by definition.

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
- **Product sizes** — Only the four labels used by the catalogue: `10 مل`, `30 مل`, `50 مل`, `100 مل`. Never add another label; prices and stock live per size in `products.json`.
- **`products.json` format:** Always an array `[{...}, {...}]`.
- **`products.json` changes must pass `npm run validate-json`** (which now runs Zod schema validation via `src/schemas/product-schema.ts`). **Do not edit product fields without checking `src/schemas/product-schema.ts` first** — it is the single source of truth for the `Product` type. Never add/remove/rename a product field in the JSON without updating the schema in the same change (and vice versa).
- **Product schema** — `src/schemas/product-schema.ts` derives `Product`, `ProductNotes`, `ProductSize` via `z.infer`. `src/types/product.ts` only re-exports from it. Client components may import the schema file (`import type` only) — it is zod-pure with no `node:fs` dependency.
- **`FullSettings` type** includes `shipping: { cost: number }` (flat fee, no free-shipping threshold) — always read it through `getShippingFee(settings)`, never hardcode shipping.
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

- `ThemeProvider` receives `initialTheme` prop (pre-loaded by `layout.tsx`) and exposes it to client components. It does **not** touch the DOM: the brand colours are written as an inline style on `<html>` during the server render (no flash).
- `CartProvider` initializes with `[]` (matching server render) and hydrates from localStorage in `useEffect` — prevents hydration mismatch.
- `ToastProvider` manages toast notifications (`useToast()` hook — `showToast(message, type?)`).

## Key Technical Details

- **Shadcn base-nova style** — components use `@base-ui/react` (not Radix). Button supports `render` prop for composition: `<Button render={<Link href="/" />}>`. Use this instead of wrapping buttons in links.
- **Button default variant** — purple `primary` (`--color-brand`, white text, pill). `secondary` is a purple outline; `tertiary` is text-only. Sizes are 40/44/52px with a 2px purple focus ring. See `docs/Design-System.md`.
- **`formatPrice()`** (`src/lib/currency.ts`) — uses `toLocaleString("ar-EG")`, produces Arabic-Indic numerals (١٬٢٠٠ ج.م).
- **Order numbers** — format `PDF-YYYYMMDD-NNNNN` (e.g. `PDF-20260716-00125`), generated on the **server** by `/api/orders` and returned in the response.
- **Checkout form** — Only 3 fields: name, phone, address. Schema in `src/schemas/checkout.ts`.
- **JSON-LD** structured data (Organization, WebSite, Store schemas) injected in `layout.tsx` `<head>`.
- **Security headers** applied via `next.config.ts` — X-Content-Type-Options, X-Frame-Options, HSTS, etc.
- **Caching** — `/logos/` immutable. No more `/data/` or `/content/` HTTP caching headers (data is loaded from filesystem, not HTTP).
- **`error.tsx` and `not-found.tsx`** render outside Provider tree — cannot use hooks. Hardcoded Arabic is intentional there.
- **`robots.txt` and `sitemap.xml`** are generated by `src/app/robots.ts` and `src/app/sitemap.ts` (the sitemap lists the homepage plus every product).
- **`json-loader.ts`** uses `/* turbopackIgnore: true */` on `process.cwd()` to suppress NFT trace warnings. Do not remove this comment.
- **Product type** — `Product.notes` is `ProductNotes { top: string[]; middle: string[]; base: string[] }` (all three required, not a flat string array). `Product.type` is `"شرقي" | "غربي"`; the brand tier is `Product.house`: `"ديزاينر" | "نيش" | "دووب"`.
- **Product card** — Shows a neutral badge, name, "وصف المنتج" title, short description (2 lines), size selector (single row), price, and a purple `primary` "اشتري الآن" plus an outline `secondary` "أضف إلى السلة" button. Featured products get the gold `فاخر` badge.

## Design System

- Tokens live in `src/app/globals.css`; nothing else may declare a colour, radius or shadow. `npm run check:tokens` enforces it.
- `/dev/design-system` renders the whole system (404 in production).
- Full reference: `docs/Design-System.md`.

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
