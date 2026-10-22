import { describe, it, expect } from "vitest";
import type { Product } from "@/schemas/product-schema";
import {
  applyEnrichment,
  buildCsv,
  parseCsv,
  renderCompletenessMarkdown,
  rowFromCells,
  summariseCompleteness,
  toCsvCell,
} from "./product-enrichment";

/** One minimal, valid product — nothing optional is filled. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "PF001",
    sku: "PF001",
    slug: "pf001",
    name: "عطر تجريبي",
    brand: "Parfums De Foda",
    description: "وصف تجريبي",
    image: "/products/PF001.png",
    gallery: ["/products/PF001.png"],
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 1,
    sizes: [
      { label: "10 مل", price: 120, inStock: true },
      { label: "50 مل", price: 500, inStock: true },
    ],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "عطر تجريبي", description: "وصف تجريبي" },
    ...overrides,
  };
}

const HEADER = [
  "slug",
  "name",
  "concentration",
  "family",
  "top_notes",
  "heart_notes",
  "base_notes",
  "size_ml_per_size",
  "gallery_extra",
];

function rowsFrom(csv: string) {
  const { header, rows } = parseCsv(csv);
  return rows.map((cells) => rowFromCells(header, cells));
}

// ─── Fixtures (small, Arabic included, bad rows included) ───────────────────

const GOOD_CSV = [
  "\uFEFFslug,name,concentration,family,top_notes,heart_notes,base_notes,size_ml_per_size,gallery_extra",
  "pf001,عطر تجريبي,EDP,جلدي,هيل|فلفل وردي,باتشولي|قرفة,جلود|عود,10 مل=10|50 مل=50,/products/PF001-2.png",
  "",
].join("\r\n");

const BAD_CSV = [
  "slug,name,concentration,family,top_notes,heart_notes,base_notes,size_ml_per_size,gallery_extra",
  "pf001,عطر تجريبي,extrait,spicy,عود، مسك,,,250 مل=250,products/PF001-2.png",
  "pf404,غير موجود,edp,woody,,,,,",
  ",بلا معرّف,edp,,,,,,",
].join("\n");

describe("parseCsv", () => {
  it("strips the BOM and handles CRLF", () => {
    const table = parseCsv(GOOD_CSV);
    expect(table.header[0]).toBe("slug");
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0][1]).toBe("عطر تجريبي");
  });

  it("keeps commas and newlines inside quoted cells", () => {
    const table = parseCsv('a,b\n"x, y","line1\nline2"\n');
    expect(table.rows[0]).toEqual(["x, y", "line1\nline2"]);
  });

  it("unescapes doubled quotes", () => {
    const table = parseCsv('a\n"say ""hi"""\n');
    expect(table.rows[0][0]).toBe('say "hi"');
  });

  it("ignores blank trailing lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n").rows).toEqual([["1", "2"]]);
  });
});

describe("rowFromCells", () => {
  it("maps by header name, not position", () => {
    const row = rowFromCells(["family", "slug"], ["wood", "pf001"]);
    expect(row.slug).toBe("pf001");
    expect(row.family).toBe("wood");
    expect(row.concentration).toBe("");
  });

  it("tolerates a short row", () => {
    const row = rowFromCells(HEADER, ["pf001"]);
    expect(row.gallery_extra).toBe("");
  });
});

describe("applyEnrichment — accepts real data", () => {
  it("fills every column from a valid row", () => {
    const result = applyEnrichment([makeProduct()], rowsFrom(GOOD_CSV));
    const product = result.products[0];

    expect(result.rejections).toEqual([]);
    expect(product.concentration).toBe("edp");
    expect(product.family).toBe("leather");
    expect(product.notes).toEqual({
      top: ["هيل", "فلفل وردي"],
      middle: ["باتشولي", "قرفة"],
      base: ["جلود", "عود"],
    });
    expect(product.sizes.map((size) => size.ml)).toEqual([10, 50]);
    expect(product.gallery).toEqual(["/products/PF001.png", "/products/PF001-2.png"]);
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it("accepts the Arabic label for an enum", () => {
    const rows = rowsFrom(
      "slug,concentration,family\npf001,أو دو بارفوم,خشبي\n",
    );
    const result = applyEnrichment([makeProduct()], rows);
    expect(result.products[0].concentration).toBe("edp");
    expect(result.products[0].family).toBe("woody");
  });

  it("leaves empty cells absent", () => {
    const result = applyEnrichment([makeProduct()], rowsFrom("slug,concentration\npf001,\n"));
    expect(result.products[0].concentration).toBeUndefined();
    expect(result.changes).toEqual([]);
  });

  it("does not mutate the input products", () => {
    const product = makeProduct();
    applyEnrichment([product], rowsFrom(GOOD_CSV));
    expect(product.concentration).toBeUndefined();
    expect(product.notes.top).toEqual([]);
    expect(product.sizes[0].ml).toBeUndefined();
  });
});

describe("applyEnrichment — rejects without guessing", () => {
  it("rejects unknown enums, unknown sizes, bad paths and unknown slugs", () => {
    const result = applyEnrichment([makeProduct()], rowsFrom(BAD_CSV));

    expect(result.unknownSlugs).toEqual(["pf404"]);
    const reasons = result.rejections.map((rejection) => rejection.column);
    expect(reasons).toContain("slug");
    expect(reasons).toContain("concentration");
    expect(reasons).toContain("family");
    expect(reasons).toContain("size_ml_per_size");
    expect(reasons).toContain("gallery_extra");

    // A rejected cell never half-applies its row.
    expect(result.products[0].concentration).toBeUndefined();
    expect(result.products[0].family).toBeUndefined();
    expect(result.products[0].sizes[0].ml).toBeUndefined();
    expect(result.products[0].gallery).toEqual(["/products/PF001.png"]);
  });

  it("rejects notes separated by commas instead of |", () => {
    const result = applyEnrichment(
      [makeProduct()],
      rowsFrom("slug,top_notes\npf001,عود، مسك\n"),
    );
    expect(result.rejections[0].reason).toContain("|");
    expect(result.products[0].notes.top).toEqual([]);
  });

  it("rejects a non-positive volume", () => {
    const result = applyEnrichment(
      [makeProduct()],
      rowsFrom("slug,size_ml_per_size\npf001,10 مل=0\n"),
    );
    expect(result.rejections[0].column).toBe("size_ml_per_size");
    expect(result.products[0].sizes[0].ml).toBeUndefined();
  });

  it("rejects a row with no slug", () => {
    const result = applyEnrichment([makeProduct()], rowsFrom("slug,concentration\n,edp\n"));
    expect(result.rejections[0].column).toBe("(row)");
    expect(result.changes).toEqual([]);
  });
});

describe("applyEnrichment — overwrite protection", () => {
  const existing = () =>
    makeProduct({
      concentration: "parfum",
      family: "woody",
      notes: { top: ["هيل"], middle: [], base: [] },
      sizes: [
        { label: "10 مل", price: 120, inStock: true, ml: 10 },
        { label: "50 مل", price: 500, inStock: true },
      ],
    });

  it("keeps an existing value unless --force", () => {
    const result = applyEnrichment(
      [existing()],
      rowsFrom("slug,concentration,family,top_notes,size_ml_per_size\npf001,edp,floral,ورد,10 مل=99\n"),
    );

    expect(result.products[0].concentration).toBe("parfum");
    expect(result.products[0].family).toBe("woody");
    expect(result.products[0].notes.top).toEqual(["هيل"]);
    expect(result.products[0].sizes[0].ml).toBe(10);
    expect(result.rejections).toHaveLength(4);
    for (const rejection of result.rejections) {
      expect(rejection.reason).toContain("--force");
    }
  });

  it("overwrites with --force", () => {
    const result = applyEnrichment(
      [existing()],
      rowsFrom("slug,concentration,family,top_notes,size_ml_per_size\npf001,edp,floral,ورد,10 مل=99\n"),
      { force: true },
    );

    expect(result.rejections).toEqual([]);
    expect(result.products[0].concentration).toBe("edp");
    expect(result.products[0].family).toBe("floral");
    expect(result.products[0].notes.top).toEqual(["ورد"]);
    expect(result.products[0].sizes[0].ml).toBe(99);
  });

  it("does not count an identical value as a change", () => {
    const result = applyEnrichment(
      [existing()],
      rowsFrom("slug,concentration\npf001,parfum\n"),
    );
    expect(result.changes).toEqual([]);
    expect(result.rejections).toEqual([]);
  });
});

describe("CSV writing", () => {
  it("quotes only cells that need it", () => {
    expect(toCsvCell("plain")).toBe("plain");
    expect(toCsvCell("a,b")).toBe('"a,b"');
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("round-trips Arabic and separators", () => {
    const csv = buildCsv([["slug", "top_notes"], ["pf001", "هيل|عود"]]);
    const table = parseCsv(csv);
    expect(table.rows[0]).toEqual(["pf001", "هيل|عود"]);
  });
});

describe("completeness", () => {
  it("counts filled fields across the catalogue", () => {
    const rows = summariseCompleteness([
      makeProduct({ concentration: "edp", family: "woody" }),
      makeProduct({ slug: "pf002", notes: { top: ["عود"], middle: [], base: [] } }),
      makeProduct({ slug: "pf003", sizes: [{ label: "50 مل", price: 1, inStock: true, ml: 50 }] }),
    ]);

    const byField = Object.fromEntries(rows.map((row) => [row.field, row.filled]));
    expect(byField.concentration).toBe(1);
    expect(byField.family).toBe(1);
    expect(byField["notes (any level)"]).toBe(1);
    expect(byField["size ml (every size)"]).toBe(1);
    expect(rows.every((row) => row.total === 3)).toBe(true);
  });

  it("renders a markdown table with Arabic and English headers", () => {
    const md = renderCompletenessMarkdown([makeProduct()], "2026-10-23");
    expect(md).toContain("2026-10-23");
    expect(md).toContain("| concentration | 0 | 1 | 0% |");
  });
});
