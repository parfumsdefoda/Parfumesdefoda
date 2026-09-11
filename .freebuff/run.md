# Run Doc — Parfums De Foda preview

Next.js 16 (App Router, Turbopack) storefront. Dev server is `next dev` on the default port **3000**.

## 1. Reproduce the uncommitted artifacts

A fresh checkout/worktree needs these before the server will run:

1. **Environment files** — copy from the main checkout (never symlink):
   - `.env.local` (runtime config; contains secrets — copy the file, never commit or paste values)
   - `.env` (if present)
   ```bash
   cp /path/to/main/checkout/.env.local .env.local
   ```
2. **Dependencies** — install with the project's package manager (npm, `package-lock.json` present):
   ```bash
   npm install
   ```
3. **Data files are committed** (`data/`, `content/`, `locales/`) — no generation step. All JSON is read from the filesystem at request time via `src/lib/json-loader.ts`; there is no build-time data pipeline to run first.

## 2. Run the server

Default port is 3000. Confirm it is free before starting:

```bash
netstat -ano | grep ":3000"
```

**Observed behavior:** even with 3000 free, `next dev` in this environment auto-selected a random free port (60198) and printed it in the log:

```
▲ Next.js 16.2.10 (Turbopack)
- Local:         http://localhost:60198
```
So **always read the log for the `Local:` line** instead of assuming 3000. To pin a port explicitly, use `npm run dev -- -p 3000`.

Start detached on Windows (PowerShell), logging stdout and stderr to **different** files:

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Then verify the process survived and the URL answers:

```powershell
powershell -NoProfile -Command "Get-Process -Id <pid>"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

If port 3000 is occupied, pick a free port and pass it explicitly: `npm run dev -- -p <port>`.

## Notes

- `npm run build` + `npm run start` is the production check; `next dev` is sufficient for live preview.
- Other useful scripts: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate-json`.
