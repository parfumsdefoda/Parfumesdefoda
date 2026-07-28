import { Cairo } from "next/font/google";

/**
 * Cairo font configuration for Arabic text.
 * Uses the Arabic character subset for optimized loading.
 */
export const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  display: "swap",
  adjustFontFallback: true,
  // Preload the most common weights
  weight: ["300", "400", "500", "600", "700", "800"],
});
