/**
 * Server-side JSON file loader.
 *
 * Reads JSON files directly from the filesystem using node:fs/promises.
 * Used by services to load data from /data/ and /content/ directories.
 *
 * Caching:
 * - Production: results are cached in memory (files don't change at runtime)
 * - Development: no cache (allows hot-reload of JSON files)
 *
 * @example
 *   const products = await readJsonFile<Product[]>("data/products.json", []);
 *   const settings = await readJsonFile<StoreSettings>("data/settings.json", defaultSettings);
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const isDev = process.env.NODE_ENV === "development";

// In-memory cache — populated on first read, reused for subsequent calls.
// In development, caching is skipped so JSON edits are picked up immediately.
const cache = new Map<string, unknown>();

/**
 * Read and parse a JSON file from the project root.
 *
 * @param relativePath  Path relative to project root (e.g. "data/products.json")
 * @param fallback      Value returned when the file is missing or invalid
 * @returns             Parsed JSON data, or the fallback
 */
export async function readJsonFile<T>(
  relativePath: string,
  fallback: T,
): Promise<T> {
  // Return cached result in production
  if (!isDev) {
    const cached = cache.get(relativePath);
    if (cached !== undefined) return cached as T;
  }

  try {
    const fullPath = join(/* turbopackIgnore: true */ process.cwd(), relativePath);
    const raw = await readFile(fullPath, "utf-8");
    const data = JSON.parse(raw) as T;

    // Cache in production only
    if (!isDev) {
      cache.set(relativePath, data);
    }

    return data;
  } catch (error) {
    // Distinguish between "file not found" and "parse error"
    if (error instanceof SyntaxError) {
      console.error(`[json-loader] Invalid JSON in ${relativePath}:`, error.message);
    } else {
      console.error(`[json-loader] Failed to read ${relativePath}:`, error);
    }
    return fallback;
  }
}
