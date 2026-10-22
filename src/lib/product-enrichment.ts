/**
 * Product enrichment — the CSV round-trip the owner uses to fill optional
 * product facts (concentration, scent family, notes, per-size volume, extra
 * gallery views) without ever touching TypeScript.
 *
 * Pure and dependency-free: the two scripts in `scripts/` do the file I/O, this
 * module does parsing, validation and merging, so both can be unit tested.
 *
 * NOTHING IS INVENTED. A cell the owner leaves empty stays absent in
 * `products.json`; a cell that fails validation is rejected and reported, never
 * guessed at or silently coerced.
 */

import {
  CONCENTRATIONS,
  SCENT_FAMILIES,
  type Concentration,
  type Product,
  type ScentFamily,
} from "../schemas/product-schema";

// ─── Columns ────────────────────────────────────────────────────────────────

/**
 * The CSV contract. `name` is read-only context for the owner; `heart_notes`
 * is the phase's word for the middle of the pyramid, which the catalogue stores
 * as `notes.middle`.
 */
export const ENRICHMENT_COLUMNS = [
  "slug",
  "name",
  "concentration",
  "family",
  "top_notes",
  "heart_notes",
  "base_notes",
  "size_ml_per_size",
  "gallery_extra",
] as const;

export type EnrichmentColumn = (typeof ENRICHMENT_COLUMNS)[number];

/** Multi-value cells are joined with this separator (`|`). */
export const CELL_SEPARATOR = "|";

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

  // Final field / record when the file does not end with a newline.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header = [], ...rows] = records;
  return {
    header: header.map((cell) => cell.trim()),
    // Drop fully blank lines (Excel likes to add one at the end).
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

// ─── Row model ──────────────────────────────────────────────────────────────

export type EnrichmentRow = Record<EnrichmentColumn, string>;

/** Map a CSV record onto the column contract; missing trailing cells are "". */
export function rowFromCells(header: string[], cells: string[]): EnrichmentRow {
  const empty = Object.fromEntries(
    ENRICHMENT_COLUMNS.map((column) => [column, ""]),
  ) as EnrichmentRow;

  for (const column of ENRICHMENT_COLUMNS) {
    const index = header.indexOf(column);
    if (index !== -1) empty[column] = (cells[index] ?? "").trim();
  }
  return empty;
}

// ─── Result model ───────────────────────────────────────────────────────────

export interface EnrichmentChange {
  slug: string;
  field: string;
  from: string;
  to: string;
}

export interface EnrichmentRejection {
  slug: string;
  column: EnrichmentColumn | "(row)";
  value: string;
  reason: string;
}

export interface ApplyOptions {
  /** Allow overwriting a value that is already filled in. */
  force?: boolean;
}

export interface ApplyResult {
  products: Product[];
  changes: EnrichmentChange[];
  rejections: EnrichmentRejection[];
  /** Rows whose slug matched nothing in the catalogue. */
  unknownSlugs: string[];
}

// ─── Cell helpers ───────────────────────────────────────────────────────────

function splitList(cell: string): string[] {
  return cell
    .split(CELL_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function describe(value: unknown): string {
  return Array.isArray(value) ? value.join(` ${CELL_SEPARATOR} `) : String(value);
}

/**
 * `EDP` / `أو دو بارفوم` are both accepted in the concentration column; only
 * the schema code is stored.
 */
function resolveEnum<T extends string>(
  raw: string,
  values: readonly T[],
  label?: (value: T) => string | null,
): T | null {
  const needle = raw.trim().toLowerCase();
  for (const value of values) {
    if (value === needle) return value;
    if (label && label(value)?.trim() === raw.trim()) return value;
  }
  return null;
}

const CONCENTRATION_LABEL_AR: Record<Concentration, string> = {
  parfum: "بارفوم",
  edp: "أو دو بارفوم",
  edt: "أو دو تواليت",
  edc: "أو دو كولونيا",
  oil: "زيت عطري",
};

const FAMILY_LABEL_AR: Record<ScentFamily, string> = {
  aromatic: "أروماتي",
  citrus: "حمضي",
  floral: "زهري",
  fougere: "فوجير",
  fresh: "منعش",
  gourmand: "جورماند",
  leather: "جلدي",
  musk: "مسكي",
  oriental: "شرقي",
  woody: "خشبي",
};

// ─── Merge ──────────────────────────────────────────────────────────────────

/**
 * Merge CSV rows into the catalogue.
 *
 * - Empty cells are ignored (never cleared, never filled with a guess).
 * - Invalid cells are rejected with a reason and leave the product untouched.
 * - A non-empty existing value is only replaced with `force`.
 *
 * Returns fresh product objects; the input array is not mutated.
 */
export function applyEnrichment(
  products: Product[],
  rows: EnrichmentRow[],
  options: ApplyOptions = {},
): ApplyResult {
  const force = options.force ?? false;
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const updated = new Map<string, Product>();
  const changes: EnrichmentChange[] = [];
  const rejections: EnrichmentRejection[] = [];
  const unknownSlugs: string[] = [];

  const reject = (
    slug: string,
    column: EnrichmentColumn | "(row)",
    value: string,
    reason: string,
  ) => rejections.push({ slug, column, value, reason });

  const record = (
    product: Product,
    field: string,
    from: unknown,
    to: unknown,
  ) => {
    if (JSON.stringify(from) === JSON.stringify(to)) return false;
    changes.push({
      slug: product.slug,
      field,
      from: from === undefined ? "" : describe(from),
      to: describe(to),
    });
    return true;
  };

  for (const row of rows) {
    const slug = row.slug.trim();
    if (!slug) {
      reject("", "(row)", row.name, "missing slug");
      continue;
    }

    const original = bySlug.get(slug);
    if (!original) {
      unknownSlugs.push(slug);
      reject(slug, "slug", slug, "slug not found in data/products.json");
      continue;
    }

    // Work on a copy so a rejected cell never half-applies a row.
    const draft: Product = {
      ...original,
      sizes: original.sizes.map((size) => ({ ...size })),
    };
    let touched = false;

    // ── concentration ──
    if (row.concentration) {
      const value = resolveEnum(
        row.concentration,
        CONCENTRATIONS,
        (code) => CONCENTRATION_LABEL_AR[code],
      );
      if (!value) {
        reject(
          slug,
          "concentration",
          row.concentration,
          `unknown concentration — allowed: ${CONCENTRATIONS.join(", ")}`,
        );
      } else if (original.concentration && original.concentration !== value && !force) {
        reject(slug, "concentration", row.concentration, "already set — use --force");
      } else if (record(draft, "concentration", original.concentration, value)) {
        draft.concentration = value;
        touched = true;
      }
    }

    // ── family ──
    if (row.family) {
      const value = resolveEnum(
        row.family,
        SCENT_FAMILIES,
        (code) => FAMILY_LABEL_AR[code],
      );
      if (!value) {
        reject(
          slug,
          "family",
          row.family,
          `unknown family — allowed: ${SCENT_FAMILIES.join(", ")}`,
        );
      } else if (original.family && original.family !== value && !force) {
        reject(slug, "family", row.family, "already set — use --force");
      } else if (record(draft, "family", original.family, value)) {
        draft.family = value;
        touched = true;
      }
    }

    // ── notes pyramid ──
    const noteColumns: Array<{
      column: EnrichmentColumn;
      level: "top" | "middle" | "base";
    }> = [
      { column: "top_notes", level: "top" },
      { column: "heart_notes", level: "middle" },
      { column: "base_notes", level: "base" },
    ];

    for (const { column, level } of noteColumns) {
      const cell = row[column];
      if (!cell) continue;

      if (cell.includes("،") || cell.includes(",")) {
        reject(
          slug,
          column,
          cell,
          `separate notes with "${CELL_SEPARATOR}", not commas`,
        );
        continue;
      }

      const notes = unique(splitList(cell));
      if (notes.length === 0) continue;

      const existing = original.notes[level];
      if (existing.length > 0 && JSON.stringify(existing) !== JSON.stringify(notes) && !force) {
        reject(slug, column, cell, "already set — use --force");
        continue;
      }
      if (record(draft, `notes.${level}`, existing, notes)) {
        draft.notes = { ...draft.notes, [level]: notes };
        touched = true;
      }
    }

    // ── per-size ml ──
    if (row.size_ml_per_size) {
      const pairs = splitList(row.size_ml_per_size);
      for (const pair of pairs) {
        const [labelPart, mlPart] = pair.split("=").map((part) => part?.trim());
        if (!labelPart || !mlPart) {
          reject(
            slug,
            "size_ml_per_size",
            pair,
            'expected "50 مل=50" — label and volume joined by "="',
          );
          continue;
        }

        const size = draft.sizes.find((s) => s.label === labelPart);
        if (!size) {
          const known = original.sizes.map((s) => s.label).join(", ");
          reject(
            slug,
            "size_ml_per_size",
            pair,
            `unknown size "${labelPart}" — this product has: ${known || "none"}`,
          );
          continue;
        }

        const ml = Number(mlPart);
        if (!Number.isFinite(ml) || ml <= 0) {
          reject(slug, "size_ml_per_size", pair, "volume must be a positive number");
          continue;
        }

        if (size.ml !== undefined && size.ml !== ml && !force) {
          reject(slug, "size_ml_per_size", pair, "already set — use --force");
          continue;
        }
        if (record(draft, `sizes.${labelPart}.ml`, size.ml, ml)) {
          size.ml = ml;
          touched = true;
        }
      }
    }

    // ── extra gallery views ──
    if (row.gallery_extra) {
      const extras = splitList(row.gallery_extra);
      const invalid = extras.filter((path) => !path.startsWith("/"));
      for (const path of invalid) {
        reject(
          slug,
          "gallery_extra",
          path,
          'image paths start with "/" — e.g. /products/PF020-2.png',
        );
      }

      const valid = extras.filter((path) => path.startsWith("/"));
      const existing = original.gallery ?? [];
      const merged = unique([...existing, ...valid]);
      if (valid.length > 0 && record(draft, "gallery", existing, merged)) {
        draft.gallery = merged;
        touched = true;
      }
    }

    if (touched) updated.set(slug, draft);
  }

  return {
    products: products.map((product) => updated.get(product.slug) ?? product),
    changes,
    rejections,
    unknownSlugs: [...new Set(unknownSlugs)],
  };
}

// ─── Completeness ───────────────────────────────────────────────────────────

export interface CompletenessRow {
  field: string;
  filled: number;
  total: number;
}

/** How much of the catalogue carries each optional fact — the owner's gap list. */
export function summariseCompleteness(products: Product[]): CompletenessRow[] {
  const total = products.length;
  const filledNotes = (product: Product) =>
    product.notes.top.length + product.notes.middle.length + product.notes.base.length > 0;

  return [
    {
      field: "concentration",
      filled: products.filter((product) => product.concentration).length,
      total,
    },
    {
      field: "family",
      filled: products.filter((product) => product.family).length,
      total,
    },
    {
      field: "notes (any level)",
      filled: products.filter(filledNotes).length,
      total,
    },
    {
      field: "notes.top",
      filled: products.filter((product) => product.notes.top.length > 0).length,
      total,
    },
    {
      field: "notes.middle",
      filled: products.filter((product) => product.notes.middle.length > 0).length,
      total,
    },
    {
      field: "notes.base",
      filled: products.filter((product) => product.notes.base.length > 0).length,
      total,
    },
    {
      field: "size ml (every size)",
      filled: products.filter(
        (product) =>
          product.sizes.length > 0 && product.sizes.every((size) => size.ml !== undefined),
      ).length,
      total,
    },
    {
      field: "size ml (at least one)",
      filled: products.filter((product) => product.sizes.some((size) => size.ml)).length,
      total,
    },
    {
      field: "size sku (at least one)",
      filled: products.filter((product) => product.sizes.some((size) => size.sku)).length,
      total,
    },
    {
      field: "gallery (more than the cover)",
      filled: products.filter((product) => (product.gallery?.length ?? 0) > 1).length,
      total,
    },
  ];
}

/** Markdown rendering of {@link summariseCompleteness}, written after a round-trip. */
export function renderCompletenessMarkdown(products: Product[], generatedAt: string): string {
  const rows = summariseCompleteness(products);
  const lines = [
    "# حالة إثراء بيانات المنتجات / Product enrichment status",
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
    "كل حقل هنا اختياري. الخلايا الفارغة تبقى فارغة في `data/products.json` ولا يتم اختراعها.",
    "",
    "Every field here is optional. Empty cells stay absent in `data/products.json`; nothing is invented.",
    "",
  ];
  return lines.join("\n");
}
