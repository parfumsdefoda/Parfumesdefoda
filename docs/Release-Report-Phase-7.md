# Phase 7 — Release report

Branch: `phase-7-release` (from `phase-6-checkout`). Nothing merged, nothing pushed, `main` untouched.

## 1. Final gate

| Check | Result |
| --- | --- |
| `npm run validate-json` | ✅ all JSON valid (Zod catalogue check included) |
| `npm run check:tokens` | ✅ no raw hex, arbitrary shadows or sub-14px text |
| `npm run typecheck` | ✅ clean (strict) |
| `npm run lint` | ✅ clean |
| `npm run test` | ✅ 381 tests in 40 files |
| `npm run build` | ✅ Turbopack production build |
| `npm run e2e` | ✅ 69 passed, 6 skipped, 0 failed (75 tests) |
| `npm run check:derived` | ✅ 37 catalogue images with complete derivative sets |
| `npm run check:links` | ✅ 52 internal paths + 48 sitemap URLs healthy |
| `npm run preflight -- --url=` | ✅ passes (warnings only for unset channel env vars) |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| `npm run perf:check` | ⚠️ budgets pass except PDP performance 88 < 90 |

## 2. Defects found and fixed in this phase

| # | Defect | Proof | Commit |
| --- | --- | --- | --- |
| 1 | With route-level `loading.tsx`, prerendered content sat in `<div hidden id="S:0">` and never appeared without JavaScript | prerender manifest: home/FAQ/PDP each had hidden segments; Playwright no-JS test now reads hero, catalogue, PDP, breadcrumbs | `fix(no-js)` |
| 2 | Skip link focus was a no-op (`#main-content` not focusable) | active element stayed in the header; test asserts `#main-content` is focused | `fix(a11y)` |
| 3 | Error summary lost focus to RHF's first-error focus | summary focus raced React; test asserts `#checkout-error-summary` focused on all projects | `fix(checkout)` |
| 4 | Mobile filter sheet taller than the viewport, no scroll: gender facets at y = −471 on a 375×812 phone | `getBoundingClientRect` + no scrollable ancestor; now capped at 88svh and scrolls | `fix(catalog)` |
| 5 | Header/footer/inline links had 17 px touch targets (WCAG 2.5.8 AA) | Lighthouse target-size; footer links now 34×34, a11y 96/97 → 100 on all routes | `fix(a11y)` |
| 6 | `perf:check` reused a stale Lighthouse report directory | report file mtime predated the run; directory now cleared per run | `fix(tooling)` |
| 7 | `perf:check` crashed on Windows/Node 24 (`spawnSync npx.cmd EINVAL`) | reproduced; npx now runs through the shell | `fix(tooling)` |
| 8 | `check:links` ignored every sitemap URL (canonical host ≠ test base) | 0/48 sitemap URLs; now maps canonical origin onto the base | `fix(tooling)` |
| 9 | `preflight` demanded coming-soon products be absent from the sitemap, contradicting `src/app/sitemap.ts` and the E2E contract | preflight failed on a correct sitemap; rule now checks hidden products only | `fix(tooling)` |

Also fixed in the interrupted session and committed here: chat body bound (413 before buffering), sanitised server logs, CSP in report-only mode (`fix(security)`).

## 3. End-to-end suite

- 25 specs × 3 projects (chromium 1440, chromium 375, webkit 375) = 75 tests.
- 69 pass, 6 skip (desktop-only and mobile-only guards), 0 fail, 0 flaky.
- Stable across 5 consecutive full runs after the final change.
- Visual snapshots for `/`, `/shop`, `/product/pf090`, `/checkout` on all three projects, animations disabled, footer masked, verified on repeated runs.

## 4. Performance (Lighthouse mobile, simulated throttling, median of 3)

| Route | Perf | LCP | TBT | CLS | A11y | SEO | JS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 | 911 ms | 28 ms | 0 | 100 | 100 | 270 KiB |
| `/shop` | 87 | 4024 ms | 36 ms | 0 | 100 | 100 | 281 KiB |
| `/shop/men` | 88 | 3870 ms | 39 ms | 0 | 100 | 100 | 281 KiB |
| `/product/pf090` | 88 | 3866 ms | 35 ms | 0 | 100 | 100 | 270 KiB |
| `/product/pf230` | 88 | 3862 ms | 36 ms | 0 | 100 | 100 | 270 KiB |
| `/cart` | 100 | 907 ms | 24 ms | 0 | 100 | 66 (noindex) | 274 KiB |
| `/checkout` | 100 | 906 ms | 26 ms | 0 | 100 | 66 (noindex) | 292 KiB |

Budgets: perf ≥ 90 on `/` and PDPs, ≥ 85 elsewhere; a11y/SEO 100 on indexable pages; JS ≤ 300 KiB; TBT ≤ 100 ms; CLS ≤ 0.01.
**The only failing budget is PDP performance (88 vs 90).** The LCP element on a PDP is the product cover (`card-800.avif`, 180 KB at DPR 1.75), already `loading=eager` + `fetchpriority=high`; LCP is 92 ms unthrottled. The remaining gap is image weight under 4G simulation.

## 5. Security

| Finding | Severity | Status |
| --- | --- | --- |
| Production dependency vulnerabilities | — | 0 (`npm audit --omit=dev`) |
| Secrets in client chunks | High if present | None found (30 chunks scanned) |
| Source maps publicly served | Medium | None (404) |
| `GET /api/orders` | — | 405 |
| Cross-origin `POST /api/orders` | — | 403 |
| Unknown product / tampered price | — | 400, server re-prices |
| Chat body over limit | — | 413 before buffering |
| System-prompt extraction | — | 5 probes: generic fallback only (provider key unset locally, so this is a partial test) |
| PII in logs | — | Order logs carry ids/counts only |
| Privacy inventory | — | `localStorage`: cart + UI prefs; `sessionStorage`: last-order summary. No cookies, no analytics, no third-party scripts. |

## 6. Open issues

| Issue | Severity | Note |
| --- | --- | --- |
| PDP performance 88 (budget 90) | Medium | LCP is the cover image; a 600w tier or AVIF-only first paint would close it |
| `rating` / `reviews` fields still in `products.json` + schema, all zero, never rendered, excluded from JSON-LD | Low | Report only, per Phase 6 instruction |
| Chat injection untested against a live model | Medium | Needs `OPENAI_API_KEY`; endpoint fails closed today |
| `data/product-master.csv` has uncommitted local changes | Low | Left untouched |
| `SITE_AUDIT_REPORT.md` untracked at repo root | Low | Pre-Phase-7 scratch; decide whether to keep |
| Lighthouse version used here does not expose the LCP element | Low | Measured separately with a PerformanceObserver |

## 7. Merge plan

1. `main` ← `phase-0-fixes` (8) ← `phase-1-foundation` (18) ← `phase-2-media-data` (27) ← `phase-2b-master` (31) ← `phase-3-cards` (37) ← `phase-4-shell` (44) ← `phase-5-pdp` (49) ← `phase-6-checkout` (54) ← `phase-7-release` (68).
2. Fast-forward each phase in order (the stack is linear) or squash one merge commit per phase; preserve the `fix:` commits' messages either way.
3. Tag `v1.0.0` on the merged `main`.
4. Rollback: instant rollback to the previous deployment in the host's dashboard, or redeploy the previous commit; no schema or database migration is involved. Orders live in memory, Redis is optional.

## 8. Commands

Before launch:

```
npm ci
npm run validate-json && npm run check:tokens && npm run typecheck && npm run lint && npm run test
npm run build
npm run check:derived
npx playwright test
npm run preflight -- --url=https://<domain>
```

After every change:

```
npm run validate-json && npm run check:tokens && npm run typecheck && npm run lint && npm run test
npm run build && npx playwright test
```
