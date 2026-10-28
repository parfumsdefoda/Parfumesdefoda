import type { MetadataRoute } from "next";
import { readJsonFile } from "@/lib/json-loader";

/**
 * Web app manifest.
 *
 * Colours come from data/theme.json (the same source the layout reads for the
 * theme-color meta), so re-theming the store never leaves a stale colour here
 * and no hex literal exists in source. Icons are rasterized from the existing
 * logo by scripts/generate-icons.mjs — the logo itself is never redrawn.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const theme = await readJsonFile<{ colors?: Record<string, string> }>(
    "data/theme.json",
    { colors: {} },
  );

  return {
    name: "Parfums De Foda",
    short_name: "PDF",
    description: "عطور فاخرة — Parfums De Foda",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    ...(theme.colors?.primary ? { background_color: theme.colors.primary } : {}),
    ...(theme.colors?.accent ? { theme_color: theme.colors.accent } : {}),
    icons: [
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
