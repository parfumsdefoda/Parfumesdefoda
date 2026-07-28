import type { Theme } from "@/types/services";
import { readJsonFile } from "@/lib/json-loader";

/**
 * Load theme data from data/theme.json using server-side file reading.
 * The data is passed to the client-side ThemeProvider as a prop.
 */
export async function loadTheme(): Promise<Theme> {
  return readJsonFile<Theme>("data/theme.json", { colors: {} });
}
