# Decisions — editorial ivory restyle

One line per ambiguity: the call, the alternative, why.

## A0 — the black page

- **Cause:** `data/theme.json` carried `"palette": "noir-or"`, one of the four
  opt-in palette presets in `globals.css`. That preset re-declares the brand
  inputs (`--brand-white: #0b0b0c`, a gold action hue) and every neutral step, so
  the whole page re-derived to near-black. `git log -S '"noir-or"'` pins it to the
  commit that turned the preset on. There is no `prefers-color-scheme` rule in the
  repo and no `.dark` class — the page was black because a config value selected a
  dark *palette*, not because of the OS.
- **Call:** `palette` back to `brand` (the ivory default) and lock the document to
  light (`color-scheme: only light`, `<meta name="color-scheme" content="light only">`,
  `<meta name="supported-color-schemes" content="light">`).
  *Alternative:* delete the presets. Kept them: they are documented, opt-in, and
  cost nothing while `brand` is selected — and A1 rewrites the tokens they derive
  from anyway.
