# UI Gallery — decision log

- **R1-1: `:root[data-palette]`, not `:root`.** The palette blocks already set
  `color-scheme` on an attribute selector, so a plain `:root` rule lost on
  specificity and the page reported `normal`. *Alternative:* `!important`
  (rejected: hides the specificity problem). *Why:* equal specificity plus
  source order is the smallest correct fix and survives both palettes.
