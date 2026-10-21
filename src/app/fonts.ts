import { Cairo } from "next/font/google";

/**
 * Cairo font configuration for Arabic text.
 *
 * Only the three weights the type scale uses are loaded (400 regular,
 * 500 medium, 700 bold) so the browser never downloads or synthesises
 * the other faces (300/600/800) that the old design relied on.
 */
export const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  display: "swap",
  adjustFontFallback: true,
  weight: ["400", "500", "700"],
});
