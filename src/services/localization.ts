/**
 * Localization service.
 * Loads all UI text from locales/ar.json using server-side file reading.
 */

import type { LocaleMessages } from "@/types/services";
import { readJsonFile } from "@/lib/json-loader";

// Re-export the pure translation function (no server dependency)
export { t } from "@/lib/locale";

// Re-export type for backward compatibility
export type { LocaleMessages } from "@/types/services";

/**
 * Load all locale messages from locales/ar.json.
 */
export async function loadLocale(): Promise<LocaleMessages> {
  return readJsonFile<LocaleMessages>("locales/ar.json", {});
}
