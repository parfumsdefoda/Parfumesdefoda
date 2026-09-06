// Query Vercel API for deployment details (git source, meta, alias state).
// Usage: node scripts/inspect-deploy.mjs <deployment-url-or-uid>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const [, , dep] = process.argv;
if (!dep) {
  console.error("usage: node scripts/inspect-deploy.mjs <deployment>");
  process.exit(1);
}

const authPath = join(
  process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
  "xdg.data",
  "com.vercel.cli",
  "auth.json",
);
const { token } = JSON.parse(readFileSync(authPath, "utf8"));
const url = `https://api.vercel.com/v6/deployments/${encodeURIComponent(dep)}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const j = await res.json();
console.log(
  JSON.stringify(
    {
      uid: j.uid,
      name: j.name,
      url: j.url,
      target: j.target,
      readyState: j.readyState,
      created: new Date(j.created ?? j.createdAt).toISOString(),
      gitSource: j.gitSource,
      meta: j.meta,
      alias: j.alias,
      aliasError: j.aliasError,
    },
    null,
    2,
  ),
);