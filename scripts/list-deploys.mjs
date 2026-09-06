// List recent production deployments with git SHA + action + alias info.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const authPath = join(
  process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
  "xdg.data",
  "com.vercel.cli",
  "auth.json",
);
const { token } = JSON.parse(readFileSync(authPath, "utf8"));

const res = await fetch(
  "https://api.vercel.com/v6/deployments?projectId=parfumesdefoda&limit=20&target=production",
  { headers: { Authorization: `Bearer ${token}` } },
);
const j = await res.json();
for (const d of j.deployments || []) {
  const sha = (d.meta?.githubCommitSha || d.gitSource?.sha || "?").slice(0, 8);
  const msg = (d.meta?.githubCommitMessage || "?").slice(0, 42);
  console.log(
    [
      new Date(d.created).toISOString(),
      sha.padEnd(8),
      `action:${(d.meta?.action || "-").padEnd(10)}`,
      d.readyState.padEnd(9),
      `alias:${d.alias ? d.alias.join(",") : "-"}`.padEnd(70),
      msg,
    ].join(" | "),
  );
}