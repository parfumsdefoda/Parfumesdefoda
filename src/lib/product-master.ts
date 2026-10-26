/**
 * Product master — the owner's ONE spreadsheet.
 *
 * `data/product-master.csv` is the single file the owner edits. This module is
 * the contract: it parses the CSV, validates every cell against the schema
 * enums, diffs it against `data/products.json` and (for the importer) merges it
 * back. The two scripts in `scripts/` only do file I/O, so everything here is
 * pure and unit-testable.
 *
 * Rules:
 * - An EMPTY cell means "unknown, do not touch". A value is never blanked.
 * - A cell that does not match an enum is rejected with a reason — never
 *   guessed at, never coerced.
 * - Prices, availability, names and descriptions only move with
 *   `--sync-commerce`, so a typo cannot silently reprice the shop.
 * - Nothing is invented. `ml` is read from the size label ("100 مل"), which is
 *   information the catalogue already carries, not a guess.
 */

import {
  CONCENTRATIONS,
  SCENT_FAMILIES,
  productSchema,
  type Concentration,
  type Product,
  type ScentFamily,
} from "../schemas/product-schema";
import { CONCENTRATION_LABELS, FAMILY_LABELS } from "./product-labels";

// ─── Columns ────────────────────────────────────────────────────────────────

/**
 * The CSV contract, in the order the file is written. The owner may reorder
 * columns (header names win), but every name must stay as written here.
 */
export const MASTER_COLUMNS = [
  "slug",
  "sku",
  "name_ar",
  "on_site",
  "gender",
  "scent_style",
  "tier",
  "season",
  "performance",
  "is_fouda_original",
  "is_oil",
  "is_featured",
  "concentration",
  "family",
  "top_notes",
  "heart_notes",
  "base_notes",
  "price_100",
  "price_50",
  "price_30",
  "price_10",
  "avail_100",
  "avail_50",
  "avail_30",
  "avail_10",
  "description_ar",
  "gallery_extra",
  "internal_note",
] as const;

export type MasterColumn = (typeof MASTER_COLUMNS)[number];

/** Multi-value cells are joined with this separator (`|`). */
export const CELL_SEPARATOR = "|";

/** Size columns exist per volume; the volume is the key, not the label. */
export const MASTER_SIZES = [100, 50, 30, 10] as const;

/** Brand string used when `--create-missing` adds a product. */
export const DEFAULT_BRAND = "Parfums De Foda";

// ─── CSV ────────────────────────────────────────────────────────────────────

export interface CsvTable {
  header: string[];
  rows: string[][];
}

/**
 * Minimal RFC-4180 reader: quoted fields, escaped quotes, commas and newlines
 * inside quotes, CRLF or LF line endings, optional UTF-8 BOM.
 */
export function parseCsv(text: string): CsvTable {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header = [], ...rows] = records;
  return {
    header: header.map((cell) => cell.trim()),
    rows: rows.filter((row) => row.some((cell) => cell.trim() !== "")),
  };
}

/** Quote a cell only when it needs it, so the file stays readable in Excel. */
export function toCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n") + "\r\n";
}

export type MasterRow = Record<MasterColumn, string>;

export interface MasterRowEntry {
  /** 1-based line in the file, used in every rejection message. */
  line: number;
  row: MasterRow;
}

export interface MasterFile {
  header: string[];
  entries: MasterRowEntry[];
  /** Lines above the header, `#` comments and rows without a slug. */
  skipped: number;
}

const EMPTY_ROW = Object.freeze(
  Object.fromEntries(MASTER_COLUMNS.map((column) => [column, ""])),
) as MasterRow;

/** Map a CSV record onto the column contract; missing trailing cells are "". */
export function rowFromCells(header: string[], cells: string[]): MasterRow {
  const row: MasterRow = { ...EMPTY_ROW };
  for (const column of MASTER_COLUMNS) {
    const index = header.indexOf(column);
    if (index !== -1) row[column] = (cells[index] ?? "").trim();
  }
  return row;
}

/**
 * Read the master file.
 *
 * The header is the first row whose FIRST cell is `slug` — anything above it
 * (notes, an old header, blank lines) is skipped. Rows that start with `#` or
 * have no slug are skipped too, so the owner can leave comments in the file.
 */
export function parseMasterFile(text: string): MasterFile {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Recover line numbers by walking the raw records the same way parseCsv did.
  const lines = splitRecordsWithLines(input);

  const headerIndex = lines.findIndex(
    (entry) => entry.cells[0]?.trim().toLowerCase() === "slug",
  );

  if (headerIndex === -1) {
    return { header: [], entries: [], skipped: lines.length };
  }

  const header = lines[headerIndex].cells.map((cell) => cell.trim());
  const entries: MasterRowEntry[] = [];
  let skipped = headerIndex + 1;

  for (const entry of lines.slice(headerIndex + 1)) {
    const first = entry.cells[0]?.trim() ?? "";
    if (first === "" || first.startsWith("#")) {
      skipped += 1;
      continue;
    }
    if (!entry.cells.some((cell) => cell.trim() !== "")) {
      skipped += 1;
      continue;
    }
    entries.push({ line: entry.line, row: rowFromCells(header, entry.cells) });
  }

  return { header, entries, skipped };
}

/** Records of a CSV text with their 1-based starting line. */
function splitRecordsWithLines(input: string): { line: number; cells: string[] }[] {
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const push = () => {
    cells.push(field);
    records.push({ line: recordLine, cells });
    cells = [];
    field = "";
    recordLine = line + 1;
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      if (char === "\n") line += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(field);
      field = "";
    } else if (char === "\n") {
      push();
      line += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || cells.length > 0) push();
  return records;
}

// ─── Value decoding ─────────────────────────────────────────────────────────

const lower = (value: string) => value.trim().toLowerCase();

const GENDER_ALIASES = new Map<string, Product["gender"]>([
  ["رجالي", "رجالي"],
  ["رجال", "رجالي"],
  ["men", "رجالي"],
  ["male", "رجالي"],
  ["نسائي", "نسائي"],
  ["حريمي", "نسائي"],
  ["نساء", "نسائي"],
  ["women", "نسائي"],
  ["female", "نسائي"],
  ["للجنسين", "للجنسين"],
  ["unisex", "للجنسين"],
]);

const STYLE_ALIASES = new Map<string, Product["type"]>([
  ["شرقي", "شرقي"],
  ["oriental", "شرقي"],
  ["eastern", "شرقي"],
  ["غربي", "غربي"],
  ["western", "غربي"],
]);

const TIER_ALIASES = new Map<string, Product["house"]>([
  ["ديزاينر", "ديزاينر"],
  ["designer", "ديزاينر"],
  ["نيش", "نيش"],
  ["niche", "نيش"],
  ["دووب", "دووب"],
  ["dupe", "دووب"],
  ["clone", "دووب"],
]);

const SEASON_ALIASES = new Map<string, Product["season"]>([
  ["صيفي", "صيفي"],
  ["summer", "صيفي"],
  ["شتوي", "شتوي"],
  ["winter", "شتوي"],
  ["خريفي", "خريفي"],
  ["autumn", "خريفي"],
  ["fall", "خريفي"],
  ["ربيعي", "ربيعي"],
  ["spring", "ربيعي"],
]);

const PERFORMANCE_ALIASES = new Map<string, Product["performance"]>([
  ["أداء ضعيف", "أداء ضعيف"],
  ["weak", "أداء ضعيف"],
  ["أداء متوسط", "أداء متوسط"],
  ["moderate", "أداء متوسط"],
  ["medium", "أداء متوسط"],
  ["أداء قوي", "أداء قوي"],
  ["strong", "أداء قوي"],
  ["أداء صاروخي", "أداء صاروخي"],
  ["rocket", "أداء صاروخي"],
  ["beast", "أداء صاروخي"],
]);

const TRUE_VALUES = new Set(["نعم", "yes", "y", "true", "1", "✓"]);
const FALSE_VALUES = new Set(["لا", "no", "n", "false", "0", "✗"]);

/** `نعم` / `لا` (or the English equivalent). Null when the cell is neither. */
export function readBool(cell: string): boolean | null {
  const value = lower(cell);
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return null;
}

const CONCENTRATION_ALIASES = new Map<string, Concentration>(
  CONCENTRATIONS.map((code) => [code, code] as const),
);
for (const code of CONCENTRATIONS) {
  CONCENTRATION_ALIASES.set(lower(CONCENTRATION_LABELS[code]), code);
}
CONCENTRATION_ALIASES.set("eau de parfum", "edp");
CONCENTRATION_ALIASES.set("eau de toilette", "edt");
CONCENTRATION_ALIASES.set("eau de cologne", "edc");
// Both spellings are in the wild: the owner's CSV used بارفوم, the store's
// own copy and the Egyptian market use بارفان. Neither may break an import.
CONCENTRATION_ALIASES.set("بارفوم", "parfum");
CONCENTRATION_ALIASES.set("بارفان", "parfum");
CONCENTRATION_ALIASES.set("أو دو بارفوم", "edp");
CONCENTRATION_ALIASES.set("أو دو بارفان", "edp");

const FAMILY_ALIASES = new Map<string, ScentFamily>(
  SCENT_FAMILIES.map((code) => [code, code] as const),
);
for (const code of SCENT_FAMILIES) {
  FAMILY_ALIASES.set(lower(FAMILY_LABELS[code]), code);
}

/** Volume of a size: the stored `ml`, else the number in its label. */
export function sizeMl(size: { label: string; ml?: number }): number | null {
  if (typeof size.ml === "number" && size.ml > 0) return size.ml;
  const match = /^(\d+(?:[.,]\d+)?)/.exec(size.label.trim());
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// ─── Plan model ─────────────────────────────────────────────────────────────

export type ChangeGroup = "classification" | "enrichment" | "commerce";

export interface MasterChange {
  slug: string;
  field: string;
  group: ChangeGroup;
  from: string;
  to: string;
}

export interface MasterRejection {
  slug: string;
  /** 1-based line in the CSV, so a bad cell can be found in Excel. */
  line: number;
  column: MasterColumn | "(row)";
  value: string;
  reason: string;
}

export interface MasterRefusal {
  slug: string;
  reason: string;
}

export interface MasterCreation {
  slug: string;
  name: string;
}

export type MasterMode = "dry-run" | "apply" | "sync-commerce";

export interface MasterPlanOptions {
  mode?: MasterMode;
  createMissing?: boolean;
  /** Disk check for `/products/{SKU}.png`; the script passes fs.existsSync. */
  imageExists?: (imagePath: string) => boolean;
}

export interface MasterPlan {
  /** Catalogue after the requested mode (unchanged for a dry run). */
  products: Product[];
  changes: MasterChange[];
  rejections: MasterRejection[];
  unknownSlugs: string[];
  duplicates: string[];
  refusals: MasterRefusal[];
  creations: MasterCreation[];
  skipped: number;
  rows: number;
}

const ALL_GROUPS: ReadonlySet<ChangeGroup> = new Set<ChangeGroup>([
  "classification",
  "enrichment",
  "commerce",
]);

interface PassContext {
  createMissing: boolean;
  imageExists?: (imagePath: string) => boolean;
  includeCreates: boolean;
}

interface PassResult {
  products: Product[];
  changes: MasterChange[];
  rejections: MasterRejection[];
  unknownSlugs: string[];
  duplicates: string[];
  refusals: MasterRefusal[];
  creations: MasterCreation[];
}

/**
 * Diff the CSV against the catalogue and return the catalogue the requested
 * mode would produce.
 *
 * The change list is ALWAYS complete (all three groups), so a dry run can show
 * everything that a later `--apply --sync-commerce` would move. Only `products`
 * respects the mode.
 */
export function planMasterImport(
  products: Product[],
  text: string,
  options: MasterPlanOptions = {},
): MasterPlan {
  const mode = options.mode ?? "dry-run";
  const file = parseMasterFile(text);
  const createMissing = options.createMissing ?? false;

  const report = mergePass(products, file.entries, ALL_GROUPS, {
    createMissing,
    imageExists: options.imageExists,
    includeCreates: false,
  });

  const allowed: ReadonlySet<ChangeGroup> =
    mode === "sync-commerce"
      ? ALL_GROUPS
      : mode === "apply"
        ? new Set<ChangeGroup>(["classification", "enrichment"])
        : new Set<ChangeGroup>();

  const applied =
    mode === "dry-run"
      ? { products }
      : mergePass(products, file.entries, allowed, {
          createMissing,
          imageExists: options.imageExists,
          includeCreates: true,
        });

  return {
    products: applied.products,
    changes: report.changes,
    rejections: report.rejections,
    unknownSlugs: report.unknownSlugs,
    duplicates: report.duplicates,
    refusals: report.refusals,
    creations: report.creations,
    skipped: file.skipped,
    rows: file.entries.length,
  };
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return value.join(` ${CELL_SEPARATOR} `);
  if (value === undefined || value === null) return "";
  return String(value);
}

function splitList(cell: string): string[] {
  return cell
    .split(CELL_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function mergePass(
  products: Product[],
  entries: MasterRowEntry[],
  groups: ReadonlySet<ChangeGroup>,
  ctx: PassContext,
): PassResult {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const changes: MasterChange[] = [];
  const rejections: MasterRejection[] = [];
  const unknownSlugs: string[] = [];
  const duplicates: string[] = [];
  const refusals: MasterRefusal[] = [];
  const creations: MasterCreation[] = [];
  const created: Product[] = [];

  const seen = new Map<string, number>();
  let nextSortOrder =
    products.reduce((max, product) => Math.max(max, product.sortOrder), 0) + 1;

  let currentLine = 0;

  const reject = (
    slug: string,
    column: MasterColumn | "(row)",
    value: string,
    reason: string,
  ) => rejections.push({ slug, line: currentLine, column, value, reason });

  /**
   * Record a change and report whether this pass may mutate the draft.
   *
   * Gating the assignment (not just the report) is what makes `--apply` leave
   * prices alone: a group that is not allowed never reaches the draft.
   */
  const record = (
    slug: string,
    field: string,
    group: ChangeGroup,
    from: unknown,
    to: unknown,
  ): boolean => {
    if (!groups.has(group)) return false;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ slug, field, group, from: describe(from), to: describe(to) });
    }
    return true;
  };

  const applyEnum = <T extends string>(
    slug: string,
    cell: string,
    column: MasterColumn,
    aliases: Map<string, T>,
    assign: (value: T) => void,
  ) => {
    if (!cell) return;
    const value = aliases.get(lower(cell));
    if (!value) {
      reject(
        slug,
        column,
        cell,
        `unknown ${column} — allowed: ${[...new Set(aliases.values())].join(", ")}`,
      );
      return;
    }
    assign(value);
  };

  const applyBool = (
    slug: string,
    cell: string,
    column: MasterColumn,
    assign: (value: boolean) => void,
  ) => {
    if (!cell) return;
    const value = readBool(cell);
    if (value === null) {
      reject(slug, column, cell, "use نعم / لا (or yes / no)");
      return;
    }
    assign(value);
  };

  for (const entry of entries) {
    const { line, row } = entry;
    currentLine = line;
    const slug = row.slug.trim();

    if (seen.has(slug)) {
      duplicates.push(slug);
      reject(slug, "(row)", slug, `duplicate slug — first seen on line ${seen.get(slug)}`);
      continue;
    }
    seen.set(slug, line);

    const original = bySlug.get(slug);

    // ── A slug the catalogue does not have ──
    if (!original) {
      unknownSlugs.push(slug);
      if (!ctx.createMissing) {
        refusals.push({
          slug,
          reason: "slug not in data/products.json — re-run with --create-missing to add it",
        });
        continue;
      }

      const built = buildNewProduct(row, slug, nextSortOrder, ctx, reject);
      if ("reason" in built) {
        refusals.push({ slug, reason: built.reason });
        continue;
      }

      creations.push({ slug, name: built.product.name });
      if (ctx.includeCreates) {
        created.push(built.product);
        nextSortOrder += 1;
      }
      continue;
    }

    // Work on a copy so a rejected cell never half-applies a row.
    const draft: Product = {
      ...original,
      sizes: original.sizes.map((size) => ({ ...size })),
      notes: {
        top: [...original.notes.top],
        middle: [...original.notes.middle],
        base: [...original.notes.base],
      },
      gallery: original.gallery ? [...original.gallery] : undefined,
    };

    // ── Classification ──
    applyEnum(slug, row.gender, "gender", GENDER_ALIASES, (value) => {
      if (record(slug, "gender", "classification", original.gender, value)) draft.gender = value;
    });

    applyEnum(slug, row.scent_style, "scent_style", STYLE_ALIASES, (value) => {
      if (record(slug, "type", "classification", original.type, value)) draft.type = value;
    });

    applyEnum(slug, row.tier, "tier", TIER_ALIASES, (value) => {
      if (record(slug, "house", "classification", original.house, value)) draft.house = value;
    });

    applyEnum(slug, row.season, "season", SEASON_ALIASES, (value) => {
      if (record(slug, "season", "classification", original.season, value)) draft.season = value;
    });

    applyEnum(slug, row.performance, "performance", PERFORMANCE_ALIASES, (value) => {
      if (record(slug, "performance", "classification", original.performance, value)) {
        draft.performance = value;
      }
    });

    applyBool(slug, row.is_fouda_original, "is_fouda_original", (value) => {
      if (record(slug, "fodaOriginal", "classification", original.fodaOriginal, value)) {
        draft.fodaOriginal = value;
      }
    });

    applyBool(slug, row.is_oil, "is_oil", (value) => {
      if (record(slug, "oily", "classification", original.oily, value)) draft.oily = value;
    });

    applyBool(slug, row.is_featured, "is_featured", (value) => {
      if (record(slug, "featured", "classification", original.featured, value)) {
        draft.featured = value;
      }
    });

    applyBool(slug, row.on_site, "on_site", (value) => {
      if (record(slug, "hidden", "classification", original.hidden ?? false, !value)) {
        draft.hidden = value ? undefined : true;
      }
    });

    // ── Enrichment ──
    applyEnum(slug, row.concentration, "concentration", CONCENTRATION_ALIASES, (value) => {
      if (record(slug, "concentration", "enrichment", original.concentration, value)) {
        draft.concentration = value;
      }
    });

    applyEnum(slug, row.family, "family", FAMILY_ALIASES, (value) => {
      if (record(slug, "family", "enrichment", original.family, value)) draft.family = value;
    });

    const noteColumns: Array<{
      column: MasterColumn;
      level: "top" | "middle" | "base";
    }> = [
      { column: "top_notes", level: "top" },
      { column: "heart_notes", level: "middle" },
      { column: "base_notes", level: "base" },
    ];

    for (const { column, level } of noteColumns) {
      const cell = row[column];
      if (!cell) continue;

      if (cell.includes(",") || cell.includes("،")) {
        reject(slug, column, cell, `separate notes with "${CELL_SEPARATOR}", not commas`);
        continue;
      }

      const notes = unique(splitList(cell));
      if (notes.length === 0) continue;
      if (record(slug, `notes.${level}`, "enrichment", original.notes[level], notes)) {
        draft.notes = { ...draft.notes, [level]: notes };
      }
    }

    // Per-size volume is read from the label — the label already says it.
    for (const size of draft.sizes) {
      const ml = sizeMl(size);
      if (ml === null || size.ml === ml) continue;
      if (record(slug, `sizes.${size.label}.ml`, "enrichment", size.ml, ml)) {
        size.ml = ml;
      }
    }

    if (row.gallery_extra) {
      const extras = splitList(row.gallery_extra);
      const valid: string[] = [];
      for (const path of extras) {
        if (!path.startsWith("/")) {
          reject(
            slug,
            "gallery_extra",
            path,
            'image paths start with "/" — e.g. /products/PF020-2.png',
          );
          continue;
        }
        valid.push(path);
      }
      const existing = original.gallery ?? [original.image];
      const merged = unique([...existing, ...valid]);
      if (record(slug, "gallery", "enrichment", existing, merged)) {
        draft.gallery = merged;
      }
    }

    if (row.internal_note) {
      if (record(slug, "internalNote", "enrichment", original.internalNote, row.internal_note)) {
        draft.internalNote = row.internal_note;
      }
    }

    // ── Commerce (never applied without --sync-commerce) ──
    if (row.sku && lower(row.sku) !== lower(original.sku)) {
      reject(
        slug,
        "sku",
        row.sku,
        `sku is read-only (it is the product id, ${original.sku}) — not changed`,
      );
    }

    if (row.name_ar) {
      if (record(slug, "name", "commerce", original.name, row.name_ar)) {
        draft.name = row.name_ar;
      }
    }

    if (row.description_ar) {
      if (record(slug, "description", "commerce", original.description, row.description_ar)) {
        draft.description = row.description_ar;
      }
    }

    for (const ml of MASTER_SIZES) {
      const priceCell = row[`price_${ml}` as MasterColumn];
      const availCell = row[`avail_${ml}` as MasterColumn];

      const size = draft.sizes.find((entry) => sizeMl(entry) === ml);

      if (priceCell) {
        const price = Number(priceCell.replace(",", "."));
        if (!Number.isFinite(price) || price < 0) {
          reject(slug, `price_${ml}` as MasterColumn, priceCell, "price must be a number ≥ 0");
        } else if (!size) {
          const known = draft.sizes.map((entry) => entry.label).join(", ") || "none";
          reject(
            slug,
            `price_${ml}` as MasterColumn,
            priceCell,
            `this product has no ${ml} مل size (has: ${known}) — a size is never created from a price`,
          );
        } else if (record(slug, `sizes.${size.label}.price`, "commerce", size.price, price)) {
          size.price = price;
        }
      }

      if (availCell) {
        const inStock = readBool(availCell);
        if (inStock === null) {
          reject(
            slug,
            `avail_${ml}` as MasterColumn,
            availCell,
            "use نعم / لا (or yes / no)",
          );
        } else if (!size) {
          const known = draft.sizes.map((entry) => entry.label).join(", ") || "none";
          reject(
            slug,
            `avail_${ml}` as MasterColumn,
            availCell,
            `this product has no ${ml} مل size (has: ${known})`,
          );
        } else if (
          record(slug, `sizes.${size.label}.inStock`, "commerce", size.inStock, inStock)
        ) {
          size.inStock = inStock;
        }
      }
    }

    // Whole-product availability is derived from its sizes, never typed by hand.
    const anyInStock = draft.sizes.some((size) => size.inStock);
    if (anyInStock !== draft.inStock && record(slug, "inStock", "commerce", draft.inStock, anyInStock)) {
      draft.inStock = anyInStock;
    }

    bySlug.set(slug, draft);
  }

  // Rebuild in catalogue order; creations go last, in CSV order.
  const merged = products.map((product) => bySlug.get(product.slug) ?? product);

  return {
    products: [...merged, ...created],
    changes,
    rejections,
    unknownSlugs: [...new Set(unknownSlugs)],
    duplicates: [...new Set(duplicates)],
    refusals,
    creations,
  };
}

// ─── Creation ───────────────────────────────────────────────────────────────

/**
 * Build a brand-new product from a master row.
 *
 * Deliberately strict: the slug must be absent, the SKU must name a photo that
 * exists on disk, and every field the schema requires must be present and
 * valid. Anything missing is reported as a reason, never defaulted.
 */
function buildNewProduct(
  row: MasterRow,
  slug: string,
  sortOrder: number,
  ctx: PassContext,
  reject: (slug: string, column: MasterColumn | "(row)", value: string, reason: string) => void,
): { product: Product } | { reason: string } {
  const missing = (field: MasterColumn) => `cannot create: ${field} is required`;

  const name = row.name_ar;
  if (!name) return { reason: missing("name_ar") };

  const sku = row.sku.trim();
  if (!sku) return { reason: missing("sku") };

  const gender = GENDER_ALIASES.get(lower(row.gender));
  if (!gender) return { reason: row.gender ? `cannot create: unknown gender "${row.gender}"` : missing("gender") };

  const type = STYLE_ALIASES.get(lower(row.scent_style));
  if (!type) return { reason: row.scent_style ? `cannot create: unknown scent_style "${row.scent_style}"` : missing("scent_style") };

  const house = TIER_ALIASES.get(lower(row.tier));
  if (!house) return { reason: row.tier ? `cannot create: unknown tier "${row.tier}"` : missing("tier") };

  const season = SEASON_ALIASES.get(lower(row.season));
  if (!season) return { reason: row.season ? `cannot create: unknown season "${row.season}"` : missing("season") };

  const performance = PERFORMANCE_ALIASES.get(lower(row.performance));
  if (!performance) return { reason: row.performance ? `cannot create: unknown performance "${row.performance}"` : missing("performance") };

  const sizes = MASTER_SIZES.flatMap((ml) => {
    const cell = row[`price_${ml}` as MasterColumn];
    if (!cell) return [];
    const price = Number(cell.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      reject(slug, `price_${ml}` as MasterColumn, cell, "price must be a number ≥ 0");
      return [];
    }
    const availCell = row[`avail_${ml}` as MasterColumn];
    // An unset availability is NOT assumed: the size starts unpurchasable
    // until the owner says نعم.
    const inStock = availCell ? readBool(availCell) === true : false;
    return [{ label: `${ml} مل`, price, inStock, ml }];
  });

  if (sizes.length === 0) return { reason: "cannot create: at least one price (price_100/50/30/10) is required" };

  const image = `/products/${sku}.png`;
  if (ctx.imageExists && !ctx.imageExists(image)) {
    return { reason: `cannot create: image ${image} does not exist` };
  }

  const concentration = CONCENTRATION_ALIASES.get(lower(row.concentration));
  if (row.concentration && !concentration) {
    reject(slug, "concentration", row.concentration, `unknown concentration — allowed: ${CONCENTRATIONS.join(", ")}`);
  }

  const family = FAMILY_ALIASES.get(lower(row.family));
  if (row.family && !family) {
    reject(slug, "family", row.family, `unknown family — allowed: ${SCENT_FAMILIES.join(", ")}`);
  }

  const gallery = unique([image, ...splitList(row.gallery_extra).filter((path) => path.startsWith("/"))]);

  const candidate = {
    id: sku,
    sku,
    slug,
    name,
    brand: DEFAULT_BRAND,
    description: row.description_ar,
    image,
    gallery,
    gender,
    type,
    house,
    oily: readBool(row.is_oil) === true,
    fodaOriginal: readBool(row.is_fouda_original) === true,
    season,
    performance,
    featured: readBool(row.is_featured) === true,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder,
    sizes,
    inStock: sizes.some((size) => size.inStock),
    notes: {
      top: unique(splitList(row.top_notes)),
      middle: unique(splitList(row.heart_notes)),
      base: unique(splitList(row.base_notes)),
    },
    ...(concentration ? { concentration } : {}),
    ...(family ? { family } : {}),
    ...(row.internal_note ? { internalNote: row.internal_note } : {}),
    ...(readBool(row.on_site) === false ? { hidden: true } : {}),
    seo: { title: `${name} | ${DEFAULT_BRAND}`, description: "" },
  };

  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "(root)";
    return { reason: `cannot create: ${field} — ${issue?.message ?? "invalid"}` };
  }

  return { product: parsed.data };
}

// ─── Export ─────────────────────────────────────────────────────────────────

/** The row the exporter writes for one product — the inverse of the importer. */
export function masterRow(product: Product): string[] {
  const bySize = new Map<number, Product["sizes"][number]>();
  for (const size of product.sizes) {
    const ml = sizeMl(size);
    if (ml !== null) bySize.set(ml, size);
  }

  const label = <T extends string>(map: Record<T, string>, value?: T) =>
    value ? map[value] ?? value : "";

  return [
    product.slug,
    product.sku,
    product.name,
    product.hidden ? "لا" : "نعم",
    product.gender,
    product.type,
    product.house,
    product.season,
    product.performance,
    product.fodaOriginal ? "نعم" : "لا",
    product.oily ? "نعم" : "لا",
    product.featured ? "نعم" : "لا",
    label(CONCENTRATION_LABELS, product.concentration),
    label(FAMILY_LABELS, product.family),
    product.notes.top.join(CELL_SEPARATOR),
    product.notes.middle.join(CELL_SEPARATOR),
    product.notes.base.join(CELL_SEPARATOR),
    ...MASTER_SIZES.map((ml) => {
      const size = bySize.get(ml);
      return size ? String(size.price) : "";
    }),
    ...MASTER_SIZES.map((ml) => {
      const size = bySize.get(ml);
      return size ? (size.inStock ? "نعم" : "لا") : "";
    }),
    product.description,
    (product.gallery ?? [])
      .filter((image) => image !== product.image)
      .join(CELL_SEPARATOR),
    product.internalNote ?? "",
  ];
}

/** Header + one row per product, ready for `buildCsv`. */
export function masterCsvRows(products: Product[]): string[][] {
  return [[...MASTER_COLUMNS], ...products.map(masterRow)];
}

// ─── Status report ──────────────────────────────────────────────────────────

export interface MasterStatusRow {
  field: string;
  filled: number;
  total: number;
}

/** How much of the master file each field carries — the owner's gap list. */
export function summariseMasterStatus(products: Product[]): MasterStatusRow[] {
  const total = products.length;
  const count = (predicate: (product: Product) => boolean) => ({
    filled: products.filter(predicate).length,
    total,
  });

  return [
    { field: "on_site (visible)", ...count((p) => !p.hidden) },
    { field: "on_site (hidden)", ...count((p) => p.hidden === true) },
    { field: "gender", ...count((p) => Boolean(p.gender)) },
    { field: "scent_style", ...count((p) => Boolean(p.type)) },
    { field: "tier", ...count((p) => Boolean(p.house)) },
    { field: "season", ...count((p) => Boolean(p.season)) },
    { field: "performance", ...count((p) => Boolean(p.performance)) },
    { field: "is_fouda_original", ...count((p) => p.fodaOriginal) },
    { field: "is_oil", ...count((p) => p.oily) },
    { field: "is_featured", ...count((p) => p.featured) },
    { field: "concentration", ...count((p) => Boolean(p.concentration)) },
    { field: "family", ...count((p) => Boolean(p.family)) },
    {
      field: "notes (any level)",
      ...count((p) => p.notes.top.length + p.notes.middle.length + p.notes.base.length > 0),
    },
    { field: "notes.top", ...count((p) => p.notes.top.length > 0) },
    { field: "notes.middle", ...count((p) => p.notes.middle.length > 0) },
    { field: "notes.base", ...count((p) => p.notes.base.length > 0) },
    { field: "price (all four sizes)", ...count((p) => sizesWithMl(p).length === MASTER_SIZES.length) },
    {
      field: "avail (any نعم)",
      ...count((p) => p.sizes.some((size) => size.inStock)),
    },
    { field: "description", ...count((p) => p.description.trim() !== "") },
    { field: "gallery (more than the cover)", ...count((p) => (p.gallery?.length ?? 0) > 1) },
    { field: "internal_note", ...count((p) => Boolean(p.internalNote)) },
  ];
}

function sizesWithMl(product: Product) {
  return MASTER_SIZES.filter((ml) =>
    product.sizes.some((size) => sizeMl(size) === ml),
  );
}

/** Markdown rendering of {@link summariseMasterStatus}. */
export function renderMasterStatusMarkdown(
  products: Product[],
  generatedAt: string,
): string {
  const rows = summariseMasterStatus(products);
  const lines = [
    "# حالة ملف المنتجات الرئيسي / Product master status",
    "",
    `آخر تحديث / generated: ${generatedAt}`,
    "",
    "| الحقل / field | مكتمل / filled | الإجمالي / total | النسبة / share |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map((row) => {
      const share = row.total === 0 ? 0 : Math.round((row.filled / row.total) * 100);
      return `| ${row.field} | ${row.filled} | ${row.total} | ${share}% |`;
    }),
    "",
    "الملف المراد تعديله هو `data/product-master.csv`. الخلية الفارغة تعني «غير معروف» ولا تُمسح قيمة موجودة.",
    "",
    "The file to edit is `data/product-master.csv`. An empty cell means \"unknown\" and never clears an existing value.",
    "",
  ];
  return lines.join("\n");
}
