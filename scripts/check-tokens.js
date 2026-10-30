#!/usr/bin/env node
/**
 * check-tokens — guards the design-token contract.
 *
 * Fails when source code introduces a value that must live in the token
 * layer instead:
 *   - a raw hex colour (use var(--token) or color-mix from --brand-*)
 *   - an arbitrary shadow (`shadow-[...]` — use shadow-soft / shadow-lifted)
 *   - a font size below 14px (`text-[12px]`, `text-[0.7rem]`)
 *
 * Allowed exceptions are listed below with their reason.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(process.cwd(), "src");

/** Files that may contain raw colours, with the reason. */
const HEX_ALLOWLIST = new Map([
  [
    "app/globals.css",
    "the token layer itself — every colour is declared here exactly once",
  ],
  [
    "lib/design-tokens.ts",
    "TypeScript mirror of the CSS token layer (brand hexes + color-mix math) so the dev page and the contrast test can measure the real palette",
  ],
  [
    "lib/email.ts",
    "email HTML: mail clients do not support CSS custom properties, so the order email must carry literal colours",
  ],
]);

const MIN_FONT_PX = 14;

/** Token prefixes this script owns; anything else is third-party. */
const OWNED_PREFIXES = [
  "--color-",
  "--ui-",
  "--neutral-",
  "--purple-",
  "--gold-",
  "--green-",
  "--brand-",
  "--header-",
  "--space-",
  "--radius-",
  "--shadow-",
  "--ease-",
  "--duration-",
  "--gradient-",
];

function definedTokens() {
  const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  const names = new Set();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) names.add(match[1]);
  return names;
}

const DEFINED = definedTokens();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const violations = [];

function report(file, line, message, snippet) {
  violations.push({
    file: path.relative(process.cwd(), file).replaceAll("\\", "/"),
    line,
    message,
    snippet: snippet.trim().slice(0, 80),
  });
}

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  // Tests assert on literal colours on purpose; they never render.
  const allowedHex = HEX_ALLOWLIST.get(rel) || /\.test\.tsx?$/.test(file);
  const isCss = file.endsWith(".css");
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((text, index) => {
    const lineNo = index + 1;

    // Skip comments so documentation examples never fail the check.
    const code = isCss
      ? text.replace(/\/\*.*?\*\//g, "")
      : text.replace(/\/\/.*$/, "");

    if (!allowedHex) {
      // Hex colours — ignore URL fragments (#main-content) by requiring a
      // colour-shaped token bounded by quotes, spaces or punctuation.
      for (const match of code.matchAll(/(?:^|["'\s(:,[=])(#[0-9a-fA-F]{3,8})\b/g)) {
        report(
          file,
          lineNo,
          "raw hex colour — use a token (var(--brand-*) / var(--ui-*))",
          match[1],
        );
      }
    }

    if (!isCss) {
      for (const match of code.matchAll(/shadow-\[[^\]]*\]/g)) {
        report(
          file,
          lineNo,
          "arbitrary shadow — use shadow-soft or shadow-lifted",
          match[0],
        );
      }
    }

    // Every owned custom property must exist in globals.css: an undeclared
    // token resolves to `transparent`, which is invisible until it matters.
    for (const match of code.matchAll(/var\((--[a-z0-9-]+)/g)) {
      const name = match[1];
      if (!OWNED_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
      if (DEFINED.has(name)) continue;
      report(
        file,
        lineNo,
        "undeclared design token — add it to src/app/globals.css",
        name,
      );
    }

    for (const match of code.matchAll(/text-\[(\d+(?:\.\d+)?)(px|rem|em)\]/g)) {
      const value = parseFloat(match[1]);
      const px = match[2] === "px" ? value : value * 16;
      if (px < MIN_FONT_PX) {
        report(
          file,
          lineNo,
          `font size below the ${MIN_FONT_PX}px floor — use text-caption`,
          match[0],
        );
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`\ncheck:tokens — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.message}\n    ${v.snippet}`);
  }
  console.error(
    "\nTokens live in src/app/globals.css. See docs/Design-System.md.\n",
  );
  process.exit(1);
}

console.log("check:tokens — no raw hex, arbitrary shadows or sub-14px text found.");
