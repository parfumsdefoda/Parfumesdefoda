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
 * - An EMPTY cell means "unknown, do not touch". A value is never blanked by
 *   an empty cell — except the three boolean flags, where blank means `لا`.
 * - A cell containing exactly `-` clears the field (only in
 *   {@link CLEARABLE_COLUMNS}).
 * - A cell that does not match an enum is rejected with a reason — never
 *   guessed at. Arabic spelling variants (ى/ي, أ/إ/آ/ا) are folded with a
 *   warning instead of a rejection.
 * - Sizes come from the header: every `price_<ml>` / `avail_<ml>` pair is a
 *   bottle volume, whatever the column order. A price creates a missing size;
 *   an availability cell alone never does.
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
import { isComingSoon, isPlaceholderImage } from "./product-availability";

// ─── Columns ────────────────────────────────────────────────────────────────

/**
 * The CSV contract, in the order the file is written. The owner may reorder
 * columns (header names win), but every name must stay as written here.
 *
 * Size columns are NOT in this list: they are discovered from the header
 * (`price_12` / `avail_12` is a 12 مل size), so a new bottle volume never needs
 * a code change.
 */
const SIZES_SLOT = "{{sizes}}";

const COLUMN_ORDER = [
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
  "is_similar",
  "concentration",
  "family",
  "top_notes",
  "heart_notes",
  "base_notes",
  SIZES_SLOT,
  "description_ar",
  "gallery_extra",
  "internal_note",
] as const;

/** Every column that is not a per-volume price/availability column. */
export const MASTER_BASE_COLUMNS: readonly string[] = COLUMN_ORDER.filter(
  (column) => column !== SIZES_SLOT,
);

/**
 * The full column list for a set of volumes, in contract order.
 *
 * Sizes are emitted largest-first (`price_100 … price_3`, then the matching
 * `avail_*` block), which is the order the catalogue stores them in.
 */
export function masterColumnsFor(sizes: number[]): string[] {
  const ordered = [...new Set(sizes)].filter((ml) => ml > 0).sort((a, b) => b - a);
  const sizeColumns = [
    ...ordered.map((ml) => `price_${ml}`),
    ...ordered.map((ml) => `avail_${ml}`),
  ];

  return COLUMN_ORDER.flatMap((column) =>
    column === SIZES_SLOT ? sizeColumns : [column],
  );
}

/** The volumes the catalogue carried before the oil sizes existed. */
export const DEFAULT_MASTER_SIZES = [100, 50, 30, 10] as const;

/** Default header — the four catalogue sizes, for docs and simple callers. */
export const MASTER_COLUMNS: readonly string[] = masterColumnsFor([
  ...DEFAULT_MASTER_SIZES,
]);

/** A column name. Size columns are dynamic, so this is a plain string. */
export type MasterColumn = string;

/** Multi-value cells are joined with this separator (`|`). */
export const CELL_SEPARATOR = "|";

/**
 * A cell containing exactly this clears the existing value.
 *
 * Only applies to {@link CLEARABLE_COLUMNS}; anywhere else `-` is a normal
 * (and usually invalid) value. An EMPTY cell still means "do not touch".
 */
export const CLEAR_TOKEN = "-";

export const CLEARABLE_COLUMNS = [
  "gallery_extra",
  "description_ar",
  "top_notes",
  "heart_notes",
  "base_notes",
  "concentration",
  "family",
  "is_similar",
] as const;

/** Boolean-flag columns: `نعم` = true; `لا` OR blank = false. */
export const FLAG_COLUMNS = [
  "is_fouda_original",
  "is_oil",
  "is_featured",
] as const;

/**
 * Header spellings the owner may use for the same contract column.
 *
 * `is_similar` starts with `is_` but is a LIST of related products, not a
 * yes/no flag — it is deliberately absent from {@link FLAG_COLUMNS}.
 */
export const MASTER_COLUMN_ALIASES: Readonly<Record<string, string>> = {
  similar_skus: "is_similar",
};

/** The contract name for a header cell (aliases folded, no trimming). */
export function canonicalColumn(name: string): string {
  return MASTER_COLUMN_ALIASES[name] ?? name;
}

/** Hard ceiling on explicit similar-product links per product. */
export const SIMILAR_LIMIT = 6;

/**
 * Split an `is_similar` cell into references, keeping the owner's order.
 *
 * SKUs or slugs may be separated by a comma, an Arabic comma, `|`, `;` or
 * whitespace ("PF740, PF560"). Empty cells and repeats are dropped.
 */
export function parseSimilarCell(cell: string): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];
  for (const part of cell.split(/[,،|;]+|\s+/)) {
    const value = part.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(value);
  }
  return refs;
}

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
  headerReport: MasterHeaderReport;
  /** 1-based line of the header row. */
  headerLine: number;
  entries: MasterRowEntry[];
  /** Lines above the header, `#` comments and rows without a slug. */
  skipped: number;
}

export interface MasterHeaderReport {
  /** Volumes discovered from `price_*` / `avail_*` columns, largest first. */
  sizes: number[];
  /** Names that appear more than once, with their 1-based column numbers. */
  duplicates: { name: string; columns: number[] }[];
  /** Columns that are neither contract columns nor size columns. */
  unknown: string[];
  /** Known contract columns the header does not carry (= do not touch). */
  absent: string[];
}

const SIZE_COLUMN_PATTERN = /^(?:price|avail)_(\d+(?:\.\d+)?)$/;

/**
 * Read the header once and report everything that matters about it.
 *
 * Column order never matters (everything is looked up by name), duplicate
 * names are an error (silently keeping one would drop a column's data), and an
 * unknown column is ignored with a warning — the owner may keep extra notes in
 * the file.
 */
export function analyseMasterHeader(header: string[]): MasterHeaderReport {
  const duplicates: MasterHeaderReport["duplicates"] = [];
  const unknown: string[] = [];
  const sizes = new Set<number>();
  const positions = new Map<string, number[]>();

  header.forEach((rawName, index) => {
    const name = canonicalColumn(rawName.trim());
    if (!name) return;
    const columns = positions.get(name) ?? [];
    columns.push(index + 1);
    positions.set(name, columns);

    const sizeMatch = SIZE_COLUMN_PATTERN.exec(name);
    if (sizeMatch) {
      const ml = Number(sizeMatch[1]);
      if (Number.isFinite(ml) && ml > 0) sizes.add(ml);
      return;
    }
    if (!MASTER_BASE_COLUMNS.includes(name)) unknown.push(name);
  });

  for (const [name, columns] of positions) {
    if (columns.length > 1) duplicates.push({ name, columns });
  }

  return {
    sizes: [...sizes].sort((a, b) => b - a),
    duplicates,
    unknown,
    absent: MASTER_BASE_COLUMNS.filter((column) => !positions.has(column)),
  };
}

/**
 * Map a CSV record onto the column contract.
 *
 * Every header name becomes a key (so a dynamic `price_12` is carried), and
 * the base columns default to "" so a short row behaves like empty cells.
 */
export function rowFromCells(header: string[], cells: string[]): MasterRow {
  const row: MasterRow = {};
  for (const column of MASTER_BASE_COLUMNS) row[column] = "";
  header.forEach((rawName, index) => {
    const name = canonicalColumn(rawName.trim());
    if (!name) return;
    row[name] = (cells[index] ?? "").trim();
  });
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
    return {
      header: [],
      headerReport: { sizes: [], duplicates: [], unknown: [], absent: [] },
      headerLine: 0,
      entries: [],
      skipped: lines.length,
    };
  }

  const header = lines[headerIndex].cells.map((cell) => cell.trim());
  const headerReport = analyseMasterHeader(header);
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

  return {
    header,
    headerReport,
    headerLine: lines[headerIndex].line,
    entries,
    skipped,
  };
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

/**
 * Fold the Arabic spelling variants the owner actually types.
 *
 * `رجالى` → `رجالي`, `أ`/`إ`/`آ` → `ا`, tatweel and tashkeel removed, whitespace
 * collapsed. This runs BEFORE an enum lookup, so a typographic difference is a
 * warning (reported) rather than a rejected row. It never rewrites a value.
 */
export function foldArabic(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const foldKey = (value: string) => lower(foldArabic(value));

/** Folded lookup index per alias map, built once. */
const foldedIndexes = new WeakMap<object, Map<string, string>>();

function foldedIndex(aliases: Map<string, string>): Map<string, string> {
  let index = foldedIndexes.get(aliases);
  if (!index) {
    index = new Map();
    for (const [key, value] of aliases) index.set(foldKey(key), value);
    foldedIndexes.set(aliases, index);
  }
  return index;
}

/** Exact lookup first, then the folded one so `رجالى` still finds رجالي. */
export function resolveAlias<T extends string>(
  aliases: Map<string, T>,
  cell: string,
): T | undefined {
  const direct = aliases.get(lower(cell));
  if (direct !== undefined) return direct;
  return foldedIndex(aliases as unknown as Map<string, string>).get(foldKey(cell)) as
    | T
    | undefined;
}

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

const SEASON_ALIASES = new Map<string, NonNullable<Product["season"]>>([
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
  /**
   * Hide products that exist in the catalogue but not in the master.
   *
   * `true` hides every absent product; an array restricts the hiding to those
   * slugs (e.g. only the rows an earlier import created). Either way the
   * products are never deleted.
   */
  hideAbsent?: boolean | string[];
}

/** A non-blocking remark: the row is still imported. */
export interface MasterWarning {
  slug: string;
  line: number;
  column: string;
  value: string;
  message: string;
}

/** A boolean flag that `--apply` would flip (on or off). */
export interface MasterFlagToggle {
  slug: string;
  field: "fodaOriginal" | "oily" | "featured";
  to: boolean;
}

/** A placeholder image that `--apply` would point at the product's real photo. */
export interface MasterImageFix {
  slug: string;
  from: string;
  to: string;
}

/** Two visible products sharing one public name. */
export interface MasterNameCollision {
  name: string;
  slugs: string[];
}

export interface MasterPlan {
  /** Catalogue after the requested mode (unchanged for a dry run). */
  products: Product[];
  changes: MasterChange[];
  rejections: MasterRejection[];
  warnings: MasterWarning[];
  /** What the header declared, including duplicate and unknown columns. */
  header: MasterHeaderReport;
  /** Catalogue slugs the file does not mention (never deleted). */
  absentFromMaster: string[];
  /** Absent slugs this run would (or did) hide via `hideAbsent`. */
  hiddenByAbsence: string[];
  /** Visible products sharing a name, e.g. a product and its فاخر variant. */
  duplicateNames: MasterNameCollision[];
  flagToggles: MasterFlagToggle[];
  imageFixes: MasterImageFix[];
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
  /** Volumes declared by the header: the only sizes a price may create. */
  sizes: number[];
}

interface PassResult {
  products: Product[];
  changes: MasterChange[];
  rejections: MasterRejection[];
  warnings: MasterWarning[];
  flagToggles: MasterFlagToggle[];
  imageFixes: MasterImageFix[];
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
  const header = file.headerReport;

  // A duplicate column is an ERROR: keeping one silently would drop the other
  // column's data on every future refresh.
  if (header.duplicates.length > 0) {
    return {
      products,
      changes: [],
      rejections: header.duplicates.map((duplicate) => ({
        slug: "(header)",
        line: file.headerLine,
        column: duplicate.name,
        value: duplicate.name,
        reason: `duplicate column — appears at columns ${duplicate.columns.join(" and ")}`,
      })),
      warnings: [],
      header,
      absentFromMaster: [],
      hiddenByAbsence: [],
      duplicateNames: [],
      flagToggles: [],
      imageFixes: [],
      unknownSlugs: [],
      duplicates: [],
      refusals: [],
      creations: [],
      skipped: file.skipped,
      rows: file.entries.length,
    };
  }

  const report = mergePass(products, file.entries, ALL_GROUPS, {
    createMissing,
    imageExists: options.imageExists,
    includeCreates: false,
    sizes: header.sizes,
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
          sizes: header.sizes,
        });

  const masterSlugs = new Set(
    file.entries.map((entry) => entry.row.slug.trim()).filter(Boolean),
  );
  const afterImport = applied.products;
  const absentFromMaster = afterImport
    .filter((product) => !masterSlugs.has(product.slug))
    .map((product) => product.slug);

  const hideScope = options.hideAbsent;
  const requested =
    hideScope === true
      ? absentFromMaster
      : Array.isArray(hideScope)
        ? absentFromMaster.filter((slug) => hideScope.includes(slug))
        : [];
  const hiddenByAbsence = [...new Set(requested)];
  const hiddenSet = new Set(hiddenByAbsence);
  const finalProducts =
    mode === "dry-run"
      ? afterImport
      : afterImport.map((product) =>
          hiddenSet.has(product.slug) ? { ...product, hidden: true } : product,
        );

  const byName = new Map<string, string[]>();
  for (const product of products) {
    if (product.hidden) continue;
    byName.set(product.name, [...(byName.get(product.name) ?? []), product.slug]);
  }
  const duplicateNames = [...byName]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([name, slugs]) => ({ name, slugs }));

  const headerWarnings: MasterWarning[] = header.unknown.map((column) => ({
    slug: "(header)",
    line: file.headerLine,
    column,
    value: column,
    message: "unknown column — ignored (no product field is written)",
  }));

  return {
    products: finalProducts,
    changes: report.changes,
    rejections: report.rejections,
    warnings: [...headerWarnings, ...report.warnings],
    header,
    absentFromMaster,
    hiddenByAbsence,
    duplicateNames,
    flagToggles: report.flagToggles,
    imageFixes: report.imageFixes,
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
  const byLowerCaseSlug = new Map(
    products.map((product) => [product.slug.toLowerCase(), product]),
  );
  const byLowerCaseSku = new Map(
    products.map((product) => [product.sku.toLowerCase(), product]),
  );
  /** Slugs this master file actually carries — used for "absent" warnings. */
  const masterSlugSet = new Set(
    entries.map((entry) => entry.row.slug.trim()).filter(Boolean),
  );
  /** Rows in this same file, so a link to a row being created still resolves. */
  const masterBySlug = new Map(
    entries.map((entry) => [entry.row.slug.trim().toLowerCase(), entry.row]),
  );
  const masterBySku = new Map(
    entries
      .filter((entry) => entry.row.sku.trim() !== "")
      .map((entry) => [entry.row.sku.trim().toLowerCase(), entry.row]),
  );
  const changes: MasterChange[] = [];
  const rejections: MasterRejection[] = [];
  const warnings: MasterWarning[] = [];
  const flagToggles: MasterFlagToggle[] = [];
  const imageFixes: MasterImageFix[] = [];
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

  const warn = (slug: string, column: string, value: string, message: string) =>
    warnings.push({ slug, line: currentLine, column, value, message });

  /**
   * Resolve `is_similar` references (SKUs or slugs) in one product.
   *
   * Unknown references and self-references are errors. A reference to a
   * hidden / coming-soon / absent-from-this-file product is a warning: the link
   * is stored, and the PDP filters it at read time.
   */
  const readSimilar = (slug: string, cell: string): string[] => {
    const refs = parseSimilarCell(cell);
    if (refs.length > SIMILAR_LIMIT) {
      warn(
        slug,
        "is_similar",
        cell,
        `only the first ${SIMILAR_LIMIT} linked products are kept`,
      );
    }

    const resolved: string[] = [];
    for (const ref of refs.slice(0, SIMILAR_LIMIT)) {
      const key = ref.toLowerCase();
      // A reference may point at a catalogue product or at a row this same file
      // is about to create (PF740 on an earlier row).
      const target = byLowerCaseSlug.get(key) ?? byLowerCaseSku.get(key);
      const masterRow = target ? undefined : (masterBySlug.get(key) ?? masterBySku.get(key));
      const canonical = target ? target.slug : masterRow?.slug.trim();

      if (!canonical) {
        reject(
          slug,
          "is_similar",
          ref,
          "unknown SKU or slug — use a row from this catalogue (e.g. PF740)",
        );
        continue;
      }
      if (canonical === slug) {
        reject(slug, "is_similar", ref, "a product cannot list itself as similar");
        continue;
      }
      if (resolved.includes(canonical)) continue;

      if (target) {
        if (target.hidden) {
          warn(slug, "is_similar", ref, `links to ${target.slug}, which is hidden from the site`);
        } else if (isComingSoon(target)) {
          warn(slug, "is_similar", ref, `links to ${target.slug}, which is coming soon`);
        }
        if (!masterSlugSet.has(target.slug)) {
          warn(
            slug,
            "is_similar",
            ref,
            `links to ${target.slug}, which is absent from this master file`,
          );
        }
      } else if (masterRow) {
        if (readBool(masterRow.on_site) === false) {
          warn(
            slug,
            "is_similar",
            ref,
            `links to ${canonical}, which this file hides from the site`,
          );
        }
      }

      const backLink =
        target?.similarTo?.some((value) => value.toLowerCase() === slug) ??
        (masterRow
          ? parseSimilarCell(masterRow.is_similar).some(
              (value) => value.toLowerCase() === slug,
            )
          : false);
      if (!backLink) {
        warn(
          slug,
          "is_similar",
          ref,
          `one-way link: ${canonical} does not list ${slug} back (the site treats links as mutual)`,
        );
      }
      resolved.push(canonical);
    }
    return resolved;
  };

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
    const direct = aliases.get(lower(cell));
    const value = resolveAlias(aliases, cell);
    if (!value) {
      reject(
        slug,
        column,
        cell,
        `unknown ${column} — allowed: ${[...new Set(aliases.values())].join(", ")}`,
      );
      return;
    }
    const folded = foldArabic(cell);
    // Only a lookup that NEEDED folding is worth reporting; "أداء متوسط" folds
    // to "اداء متوسط" but matches exactly, so it is not a spelling variant.
    if (direct === undefined && folded !== cell.trim()) {
      warn(
        slug,
        column,
        cell,
        `normalised "${cell.trim()}" → "${folded}" before matching ${column}`,
      );
    }
    assign(value);
  };

  /** `on_site` and other "blank = do not touch" booleans. */
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

  /**
   * The three flag columns: `نعم` = true, `لا` AND blank = false.
   *
   * Every flip is reported (on or off) so a dry run shows exactly which
   * curated products would lose their flag before anything is written.
   */
  const applyFlag = (
    slug: string,
    cell: string,
    column: MasterColumn,
    field: MasterFlagToggle["field"],
    current: boolean | undefined,
    assign: (value: boolean) => void,
  ) => {
    const value = cell === "" ? false : readBool(cell);
    if (value === null) {
      reject(slug, column, cell, "use نعم / لا (or yes / no)");
      return;
    }
    if (Boolean(current) !== value) flagToggles.push({ slug, field, to: value });
    if (record(slug, field, "classification", current ?? false, value)) assign(value);
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

      const built = buildNewProduct(row, slug, nextSortOrder, ctx, reject, warn);
      if ("reason" in built) {
        refusals.push({ slug, reason: built.reason });
        continue;
      }

      // `is_similar` on a brand-new row is resolved against the catalogue it
      // is joining; `-` on a new product simply means "no links".
      if (row.is_similar && row.is_similar !== CLEAR_TOKEN) {
        const similarTo = readSimilar(slug, row.is_similar);
        built.product.similarTo = similarTo.length > 0 ? similarTo : undefined;
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

    // ── Explicit similar-product links ──
    if (row.is_similar === CLEAR_TOKEN) {
      if (record(slug, "similarTo", "enrichment", original.similarTo, undefined)) {
        draft.similarTo = undefined;
      }
    } else if (row.is_similar) {
      const similarTo = readSimilar(slug, row.is_similar);
      if (
        record(
          slug,
          "similarTo",
          "enrichment",
          original.similarTo,
          similarTo.length > 0 ? similarTo : undefined,
        )
      ) {
        draft.similarTo = similarTo.length > 0 ? similarTo : undefined;
      }
    }

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

    applyFlag(
      slug,
      row.is_fouda_original,
      "is_fouda_original",
      "fodaOriginal",
      original.fodaOriginal,
      (value) => {
        draft.fodaOriginal = value;
      },
    );

    applyFlag(slug, row.is_featured, "is_featured", "featured", original.featured, (value) => {
      draft.featured = value;
    });

    applyBool(slug, row.on_site, "on_site", (value) => {
      if (record(slug, "hidden", "classification", original.hidden ?? false, !value)) {
        draft.hidden = value ? undefined : true;
      }
    });

    // ── Enrichment ──
    if (row.concentration === CLEAR_TOKEN) {
      if (record(slug, "concentration", "enrichment", original.concentration, undefined)) {
        draft.concentration = undefined;
      }
    } else {
      applyEnum(slug, row.concentration, "concentration", CONCENTRATION_ALIASES, (value) => {
        if (record(slug, "concentration", "enrichment", original.concentration, value)) {
          draft.concentration = value;
        }
      });
    }

    if (row.family === CLEAR_TOKEN) {
      if (record(slug, "family", "enrichment", original.family, undefined)) {
        draft.family = undefined;
      }
    } else {
      applyEnum(slug, row.family, "family", FAMILY_ALIASES, (value) => {
        if (record(slug, "family", "enrichment", original.family, value)) draft.family = value;
      });
    }

    // Oil is a flag, but it may not disagree with the concentration: a product
    // cannot be an attar and an EDP at the same time.
    if (row.is_oil) {
      const oilValue = readBool(row.is_oil);
      if (oilValue === null) {
        reject(slug, "is_oil", row.is_oil, "use نعم / لا (or yes / no)");
      } else if (oilValue && draft.concentration && draft.concentration !== "oil") {
        reject(
          slug,
          "is_oil",
          row.is_oil,
          `conflict: concentration is "${CONCENTRATION_LABELS[draft.concentration]}" — an oil product uses the oil concentration or leaves it empty`,
        );
      } else {
        if (Boolean(original.oily) !== oilValue) {
          flagToggles.push({ slug, field: "oily", to: oilValue });
        }
        if (record(slug, "oily", "classification", original.oily, oilValue)) {
          draft.oily = oilValue;
        }
      }
    }

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

      if (cell === CLEAR_TOKEN) {
        if (record(slug, `notes.${level}`, "enrichment", original.notes[level], [])) {
          draft.notes = { ...draft.notes, [level]: [] };
        }
        continue;
      }

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

    // Per-size volume is read from the label — the label already says it. A
    // missing `ml` is not a change: `sizeMl()` answers from the label anyway,
    // so writing it would turn every round trip into 160 phantom diffs. Only a
    // stored `ml` that CONTRADICTS its label is repaired.
    for (const size of draft.sizes) {
      if (size.ml === undefined) continue;
      const labelMatch = /^(\d+(?:[.,]\d+)?)/.exec(size.label.trim());
      if (!labelMatch) continue;
      const fromLabel = Number(labelMatch[1].replace(",", "."));
      if (!Number.isFinite(fromLabel) || fromLabel <= 0 || fromLabel === size.ml) continue;
      if (record(slug, `sizes.${size.label}.ml`, "enrichment", size.ml, fromLabel)) {
        size.ml = fromLabel;
      }
    }

    if (row.gallery_extra === CLEAR_TOKEN) {
      const onlyCover = [original.image];
      if (
        record(slug, "gallery", "enrichment", original.gallery ?? onlyCover, onlyCover)
      ) {
        draft.gallery = onlyCover;
      }
    } else if (row.gallery_extra) {
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

    if (row.description_ar === CLEAR_TOKEN) {
      if (record(slug, "description", "commerce", original.description, "")) {
        draft.description = "";
      }
    } else if (row.description_ar) {
      if (record(slug, "description", "commerce", original.description, row.description_ar)) {
        draft.description = row.description_ar;
      }
    }

    // Every `price_<ml>` the header declares is a size, in ANY order. A price
    // for a volume the product does not have yet creates that size; a blank
    // price never does (avail alone cannot invent a bottle).
    for (const ml of ctx.sizes) {
      const priceCell = row[`price_${ml}`] ?? "";
      const availCell = row[`avail_${ml}`] ?? "";

      let size = draft.sizes.find((entry) => sizeMl(entry) === ml);
      let createdHere = false;

      if (!size && priceCell) {
        const price = Number(priceCell.replace(",", "."));
        if (!Number.isFinite(price) || price < 0) {
          reject(slug, `price_${ml}`, priceCell, "price must be a number ≥ 0");
          continue;
        }

        const label = `${ml} مل`;
        const inStock = availCell ? readBool(availCell) === true : false;
        // An explicit لا is a decision; only a SILENT size is worth a warning.
        if (!availCell) {
          warn(slug, `avail_${ml}`, availCell, `new ${label} size starts out of stock (avail is blank)`);
        }

        size = { label, price, inStock, ml };
        createdHere = true;
        if (record(slug, `sizes.${label}`, "commerce", "", `${price} ج.م`)) {
          draft.sizes.push(size);
          draft.sizes.sort((a, b) => (sizeMl(b) ?? 0) - (sizeMl(a) ?? 0));
        }
      }

      if (!size) {
        if (priceCell || availCell) {
          const known = draft.sizes.map((entry) => entry.label).join(", ") || "none";
          reject(
            slug,
            priceCell ? `price_${ml}` : `avail_${ml}`,
            priceCell || availCell,
            `this product has no ${ml} مل size (has: ${known}) — put a price in price_${ml} to create it`,
          );
        }
        continue;
      }

      // A size created in this row already carries its price and availability.
      if (createdHere) continue;

      if (priceCell) {
        const price = Number(priceCell.replace(",", "."));
        if (!Number.isFinite(price) || price < 0) {
          reject(slug, `price_${ml}`, priceCell, "price must be a number ≥ 0");
        } else if (record(slug, `sizes.${size.label}.price`, "commerce", size.price, price)) {
          size.price = price;
        }
      }

      if (availCell) {
        const inStock = readBool(availCell);
        if (inStock === null) {
          reject(slug, `avail_${ml}`, availCell, "use نعم / لا (or yes / no)");
        } else if (
          record(slug, `sizes.${size.label}.inStock`, "commerce", size.inStock, inStock)
        ) {
          size.inStock = inStock;
        }
      }
    }

    // A product still pointing at the shared placeholder but whose real photo
    // exists on disk gets that photo — never a rename, never a delete.
    const realImage = `/products/${original.sku}.png`;
    if (isPlaceholderImage(original.image) && ctx.imageExists?.(realImage)) {
      imageFixes.push({ slug, from: original.image, to: realImage });
      if (record(slug, "image", "enrichment", original.image, realImage)) {
        draft.image = realImage;
        if ((draft.gallery ?? []).every((image) => image === original.image)) {
          draft.gallery = [realImage];
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
    warnings,
    flagToggles,
    imageFixes,
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
  warn: (slug: string, column: string, value: string, message: string) => void,
): { product: Product } | { reason: string } {
  const missing = (field: MasterColumn) => `cannot create: ${field} is required`;

  const name = row.name_ar;
  if (!name) return { reason: missing("name_ar") };

  const sku = row.sku.trim();
  if (!sku) return { reason: missing("sku") };

  const gender = resolveAlias(GENDER_ALIASES, row.gender);
  if (!gender) return { reason: row.gender ? `cannot create: unknown gender "${row.gender}"` : missing("gender") };

  const type = resolveAlias(STYLE_ALIASES, row.scent_style);
  if (!type) return { reason: row.scent_style ? `cannot create: unknown scent_style "${row.scent_style}"` : missing("scent_style") };

  const house = resolveAlias(TIER_ALIASES, row.tier);
  if (!house) return { reason: row.tier ? `cannot create: unknown tier "${row.tier}"` : missing("tier") };

  // `season` is optional (the column can be absent entirely): a missing value
  // is simply unknown, not a reason to refuse the row.
  const season = resolveAlias(SEASON_ALIASES, row.season);
  if (row.season && !season) return { reason: `cannot create: unknown season "${row.season}"` };

  const performance = resolveAlias(PERFORMANCE_ALIASES, row.performance);
  if (!performance) return { reason: row.performance ? `cannot create: unknown performance "${row.performance}"` : missing("performance") };

  const sizes = ctx.sizes.flatMap((ml) => {
    const cell = row[`price_${ml}`] ?? "";
    if (!cell) return [];
    const price = Number(cell.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      reject(slug, `price_${ml}`, cell, "price must be a number ≥ 0");
      return [];
    }
    const availCell = row[`avail_${ml}`] ?? "";
    // An unset availability is NOT assumed: the size starts unpurchasable
    // until the owner says نعم.
    const inStock = availCell ? readBool(availCell) === true : false;
    if (!availCell) {
      warn(slug, `avail_${ml}`, availCell, `new ${ml} مل size starts out of stock (avail is blank)`);
    }
    return [{ label: `${ml} مل`, price, inStock, ml }];
  });

  if (sizes.length === 0) {
    return {
      reason: `cannot create: at least one price_<ml> cell is required (header sizes: ${ctx.sizes.join(", ") || "none"})`,
    };
  }

  const image = `/products/${sku}.png`;
  if (ctx.imageExists && !ctx.imageExists(image)) {
    return { reason: `cannot create: image ${image} does not exist` };
  }

  const concentration = resolveAlias(CONCENTRATION_ALIASES, row.concentration);
  if (row.concentration && !concentration) {
    reject(slug, "concentration", row.concentration, `unknown concentration — allowed: ${CONCENTRATIONS.join(", ")}`);
  }

  const family = resolveAlias(FAMILY_ALIASES, row.family);
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
    ...(season ? { season } : {}),
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

/** Every volume the catalogue carries, largest first. */
export function catalogueSizes(products: Product[]): number[] {
  const sizes = new Set<number>();
  for (const product of products) {
    for (const size of product.sizes) {
      const ml = sizeMl(size);
      if (ml !== null) sizes.add(ml);
    }
  }
  return [...sizes].sort((a, b) => b - a);
}

/** The row the exporter writes for one product — the inverse of the importer. */
export function masterRow(
  product: Product,
  sizes: number[] = catalogueSizes([product]),
  /** slug → SKU, so links are exported as SKUs. Defaults to uppercased slugs. */
  skuBySlug: ReadonlyMap<string, string> = new Map(),
): string[] {
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
    product.season ?? "",
    product.performance,
    product.fodaOriginal ? "نعم" : "لا",
    product.oily ? "نعم" : "لا",
    product.featured ? "نعم" : "لا",
    (product.similarTo ?? [])
      .map((slug) => skuBySlug.get(slug) ?? slug.toUpperCase())
      .join(", "),
    label(CONCENTRATION_LABELS, product.concentration),
    label(FAMILY_LABELS, product.family),
    product.notes.top.join(CELL_SEPARATOR),
    product.notes.middle.join(CELL_SEPARATOR),
    product.notes.base.join(CELL_SEPARATOR),
    ...sizes.map((ml) => {
      const size = bySize.get(ml);
      return size ? String(size.price) : "";
    }),
    ...sizes.map((ml) => {
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
  const sizes = catalogueSizes(products);
  const skuBySlug = new Map(products.map((product) => [product.slug, product.sku]));
  return [
    masterColumnsFor(sizes),
    ...products.map((product) => masterRow(product, sizes, skuBySlug)),
  ];
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
    { field: "is_similar", ...count((p) => (p.similarTo?.length ?? 0) > 0) },
    { field: "concentration", ...count((p) => Boolean(p.concentration)) },
    { field: "family", ...count((p) => Boolean(p.family)) },
    {
      field: "notes (any level)",
      ...count((p) => p.notes.top.length + p.notes.middle.length + p.notes.base.length > 0),
    },
    { field: "notes.top", ...count((p) => p.notes.top.length > 0) },
    { field: "notes.middle", ...count((p) => p.notes.middle.length > 0) },
    { field: "notes.base", ...count((p) => p.notes.base.length > 0) },
    {
      field: "price (every size)",
      ...count((p) => p.sizes.length > 0 && p.sizes.every((size) => size.price > 0)),
    },
    {
      field: "avail (any نعم)",
      ...count((p) => p.sizes.some((size) => size.inStock)),
    },
    { field: "description", ...count((p) => p.description.trim() !== "") },
    { field: "gallery (more than the cover)", ...count((p) => (p.gallery?.length ?? 0) > 1) },
    { field: "internal_note", ...count((p) => Boolean(p.internalNote)) },
  ];
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
