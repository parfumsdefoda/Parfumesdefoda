import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The custom type scale (see globals.css) must belong to the font-size group.
 * Without this, twMerge reads `text-caption` as a text *colour* and silently
 * drops it whenever a variant also sets a colour — which made buttons render
 * at the inherited size.
 */
const TYPE_SCALE = [
  "display",
  "title-1",
  "title-2",
  "title-3",
  "headline",
  "body",
  "caption",
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_SCALE }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
