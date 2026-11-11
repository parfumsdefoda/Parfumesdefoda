/* --------------------------------------------------------------------------
   Static preview server for the lab.
   Serves the repository root so the lab can reference the shop's real product
   photography (/public/products/derived/...). No dependencies, no build step.

     node amouage-lab/server.mjs          →  http://127.0.0.1:4400/amouage-lab/
     PORT=5000 node amouage-lab/server.mjs
   -------------------------------------------------------------------------- */
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
// Guard against an inherited PORT=0 (some shells export it): 0 means "any free
// port" to Node, which makes the printed URL unusable.
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 4400;
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname === "/") pathname = "/amouage-lab/index.html";

  // Refuse anything that escapes the repository root.
  const target = normalize(join(ROOT, pathname));
  if (!target.startsWith(ROOT + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let stats;
  try {
    stats = statSync(target);
    if (stats.isDirectory()) {
      res.writeHead(302, { Location: pathname.replace(/\/?$/, "/") }).end();
      return;
    }
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" })
      .end(`<h1>404</h1><p>${pathname}</p>`);
    return;
  }

  res.writeHead(200, {
    "content-type": MIME[extname(target).toLowerCase()] || "application/octet-stream",
    "content-length": stats.size,
    "cache-control": "no-cache"
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(target).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`lab → http://${HOST}:${PORT}/amouage-lab/  (root ${ROOT})`);
});
