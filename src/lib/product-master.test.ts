import { describe, it, expect } from "vitest";
import type { Product } from "@/schemas/product-schema";
import {
  MASTER_COLUMNS,
  buildCsv,
  masterCsvRows,
  parseCsv,
  parseMasterFile,
  planMasterImport,
  readBool,
  renderMasterStatusMarkdown,
  rowFromCells,
  sizeMl,
  summariseMasterStatus,
  toCsvCell,
} from "./product-master";

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

const csv = (lines: string[]) => lines.join("\r\n");

// ─── Parsing ────────────────────────────────────────────────────────────────

describe("parseMasterFile", () => {
  it("skips rows above the header and starts at the first `slug` row", () => {
    const file = parseMasterFile(
      csv([
        "حالة المنتجات — 2026",
        "",
        "slug,name_ar,on_site",
        "pf001,عطر,نعم",
      ]),
    );

    expect(file.header[0]).toBe("slug");
    expect(file.entries).toHaveLength(1);
    expect(file.entries[0].line).toBe(4);
    expect(file.skipped).toBe(3);
  });

  it("skips comment rows and rows without a slug", () => {
    const file = parseMasterFile(
      csv(["slug,name_ar", "# ملاحظة", ",اسم بلا معرّف", "pf001,عطر"]),
    );
    expect(file.entries.map((entry) => entry.row.slug)).toEqual(["pf001"]);
    expect(file.skipped).toBe(3);
  });

  it("strips the BOM and keeps Arabic", () => {
    const file = parseMasterFile("\uFEFFslug,name_ar\npf001,أفترنون سويم\n");
    expect(file.header[0]).toBe("slug");
    expect(file.entries[0].row.name_ar).toBe("أفترنون سويم");
  });

  it("tolerates a partial or reordered header after `slug`", () => {
    const file = parseMasterFile(csv(["slug,price_50,gender", "pf001,500,رجالي"]));
    expect(file.entries[0].row.price_50).toBe("500");
    expect(file.entries[0].row.gender).toBe("رجالي");
    expect(file.entries[0].row.name_ar).toBe("");
  });
});

describe("rowFromCells / sizeMl / readBool", () => {
  it("maps by header name, not position", () => {
    const row = rowFromCells(["gender", "slug"], ["رجالي", "pf001"]);
    expect(row.slug).toBe("pf001");
    expect(row.gender).toBe("رجالي");
    expect(row.on_site).toBe("");
  });

  it("reads a size volume from the stored ml or from the label", () => {
    expect(sizeMl({ label: "50 مل", ml: 50 })).toBe(50);
    expect(sizeMl({ label: "100 مل" })).toBe(100);
    expect(sizeMl({ label: "travel" })).toBeNull();
  });

  it("accepts Arabic and English booleans", () => {
    expect(readBool("نعم")).toBe(true);
    expect(readBool("لا")).toBe(false);
    expect(readBool("yes")).toBe(true);
    expect(readBool("maybe")).toBeNull();
  });
});

// ─── Merge ──────────────────────────────────────────────────────────────────

describe("planMasterImport — classification and enrichment", () => {
  it("applies classification through Arabic labels (حريمي → نسائي)", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["slug,gender,scent_style,tier,season,performance", "pf001,حريمي,غربي,ديزاينر,صيفي,أداء صاروخي"]),
      { mode: "apply" },
    );

    const product = plan.products[0];
    expect(plan.rejections).toEqual([]);
    expect(product.gender).toBe("نسائي");
    expect(product.type).toBe("غربي");
    expect(product.house).toBe("ديزاينر");
    expect(product.season).toBe("صيفي");
    expect(product.performance).toBe("أداء صاروخي");
  });

  it("fills concentration, family and the notes pyramid (heart → middle)", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv([
        "slug,concentration,family,top_notes,heart_notes,base_notes",
        "pf001,EDP,خشبي,هيل|فلفل وردي,باتشولي|قرفة,جلود|عود",
      ]),
      { mode: "apply" },
    );

    const product = plan.products[0];
    expect(product.concentration).toBe("edp");
    expect(product.family).toBe("woody");
    expect(product.notes).toEqual({
      top: ["هيل", "فلفل وردي"],
      middle: ["باتشولي", "قرفة"],
      base: ["جلود", "عود"],
    });
  });

  it("reads a size volume from the label without inventing it", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
    });
    expect(plan.products[0].sizes.map((size) => size.ml)).toEqual([10, 50]);
  });

  it("leaves empty cells alone", () => {
    const product = makeProduct({
      concentration: "parfum",
      description: "وصف موجود",
      sizes: [
        { label: "10 مل", price: 120, inStock: true, ml: 10 },
        { label: "50 مل", price: 500, inStock: true, ml: 50 },
      ],
    });
    const plan = planMasterImport([product], csv(["slug,concentration,description_ar", "pf001,,"]), {
      mode: "apply",
    });
    expect(plan.products[0].concentration).toBe("parfum");
    expect(plan.products[0].description).toBe("وصف موجود");
    expect(plan.changes).toEqual([]);
  });

  it("rejects an unknown enum with the line number and leaves the product untouched", () => {
    const bad = planMasterImport([makeProduct()], csv(["slug,family", "pf001,spicy"]), {
      mode: "apply",
    });
    expect(bad.rejections).toHaveLength(1);
    expect(bad.rejections[0]).toMatchObject({ column: "family", line: 2 });
    expect(bad.rejections[0].reason).toContain("unknown family");
    expect(bad.products[0].family).toBeUndefined();
  });

  it("rejects notes separated by commas instead of |", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,top_notes", "pf001,عود، مسك"]), {
      mode: "apply",
    });
    expect(plan.rejections[0].reason).toContain("|");
    expect(plan.products[0].notes.top).toEqual([]);
  });

  it("rejects a row with a duplicate slug", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["slug,name_ar", "pf001,أ", "pf001,ب"]),
      { mode: "apply" },
    );
    expect(plan.duplicates).toEqual(["pf001"]);
    expect(plan.products[0].name).toBe("عطر تجريبي");
  });
});

describe("planMasterImport — commerce is gated", () => {
  const commerceCsv = csv([
    "slug,name_ar,price_100,price_50,avail_50,description_ar",
    "pf001,اسم جديد,900,750,لا,وصف جديد",
  ]);

  it("--apply never touches prices, availability or names", () => {
    const plan = planMasterImport([makeProduct()], commerceCsv, { mode: "apply" });
    const product = plan.products[0];

    expect(product.name).toBe("عطر تجريبي");
    expect(product.description).toBe("وصف تجريبي");
    expect(product.sizes.find((size) => size.label === "50 مل")).toMatchObject({
      price: 500,
      inStock: true,
    });

    // …but a dry run still reports what would move.
    const groups = new Set(plan.changes.map((change) => change.group));
    expect(groups.has("commerce")).toBe(true);
  });

  it("--sync-commerce writes prices, availability and names", () => {
    const plan = planMasterImport([makeProduct()], commerceCsv, { mode: "sync-commerce" });
    const product = plan.products[0];
    const size50 = product.sizes.find((size) => size.label === "50 مل");

    expect(product.name).toBe("اسم جديد");
    expect(product.description).toBe("وصف جديد");
    expect(size50).toMatchObject({ price: 750, inStock: false });
    expect(product.inStock).toBe(true); // the 10 مل size is still in stock
  });

  it("reports a price for a size the product does not have instead of creating it", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,price_100", "pf001,900"]), {
      mode: "sync-commerce",
    });

    expect(plan.rejections[0].column).toBe("price_100");
    expect(plan.rejections[0].reason).toContain("no 100 مل size");
    expect(plan.products[0].sizes).toHaveLength(2);
  });

  it("a blank avail cell keeps the current availability", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,avail_50", "pf001,"]), {
      mode: "sync-commerce",
    });
    expect(plan.products[0].sizes[1].inStock).toBe(true);
    expect(plan.changes.filter((change) => change.group === "commerce")).toEqual([]);
  });

  it("rejects a non-numeric price", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,price_50", "pf001,خمسة"]), {
      mode: "sync-commerce",
    });
    expect(plan.rejections[0].column).toBe("price_50");
  });
});

// ─── Hidden ─────────────────────────────────────────────────────────────────

describe("planMasterImport — on_site", () => {
  it("on_site=لا hides the product (and keeps it in the catalogue)", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,on_site", "pf001,لا"]), {
      mode: "apply",
    });

    expect(plan.products).toHaveLength(1);
    expect(plan.products[0].hidden).toBe(true);
    expect(plan.changes[0]).toMatchObject({ field: "hidden", to: "true" });
  });

  it("on_site=نعم brings it back", () => {
    const plan = planMasterImport([makeProduct({ hidden: true })], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
    });
    expect(plan.products[0].hidden).toBeUndefined();
  });
});

// ─── Creation ───────────────────────────────────────────────────────────────

describe("planMasterImport — --create-missing", () => {
  const creationCsv = csv([
    "slug,sku,name_ar,on_site,gender,scent_style,tier,season,performance,price_50,avail_50,description_ar",
    "pf999,PF999,عطر جديد,نعم,رجالي,شرقي,نيش,شتوي,أداء قوي,600,نعم,وصف المنتج",
  ]);
  const imageExists = () => true;

  it("refuses an unknown slug without the flag", () => {
    const plan = planMasterImport([makeProduct()], creationCsv, {});
    expect(plan.unknownSlugs).toEqual(["pf999"]);
    expect(plan.creations).toEqual([]);
    expect(plan.refusals[0].reason).toContain("--create-missing");
    expect(plan.products).toHaveLength(1);
  });

  it("creates a fully specified product with the flag", () => {
    const plan = planMasterImport([makeProduct()], creationCsv, {
      mode: "apply",
      createMissing: true,
      imageExists,
    });

    expect(plan.refusals).toEqual([]);
    expect(plan.creations).toEqual([{ slug: "pf999", name: "عطر جديد" }]);

    const created = plan.products.find((product) => product.slug === "pf999");
    expect(created).toMatchObject({
      id: "PF999",
      name: "عطر جديد",
      image: "/products/PF999.png",
      description: "وصف المنتج",
      sortOrder: 2,
      gender: "رجالي",
    });
    expect(created?.sizes).toEqual([
      { label: "50 مل", price: 600, inStock: true, ml: 50 },
    ]);
    expect(created?.inStock).toBe(true);
  });

  it("refuses when the image is not on disk", () => {
    const plan = planMasterImport([makeProduct()], creationCsv, {
      mode: "apply",
      createMissing: true,
      imageExists: () => false,
    });
    expect(plan.creations).toEqual([]);
    expect(plan.refusals[0].reason).toContain("does not exist");
  });

  it.each([
    ["name_ar", "name_ar"],
    ["gender", "gender"],
    ["season", "season"],
    ["price_50", "at least one price"],
    ["sku", "sku"],
  ])("refuses a row without %s", (column, reason) => {
    const [headerLine, dataLine] = creationCsv.split("\r\n");
    const header = headerLine.split(",");
    const cells = dataLine.split(",");
    cells[header.indexOf(column)] = "";

    const plan = planMasterImport([makeProduct()], csv([headerLine, cells.join(",")]), {
      mode: "apply",
      createMissing: true,
      imageExists,
    });

    expect(plan.creations).toEqual([]);
    expect(plan.refusals[0].reason).toContain(reason);
  });

  it("refuses an unknown enum in a new product", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv([
        "slug,sku,name_ar,gender,scent_style,tier,season,performance,price_50",
        "pf999,PF999,عطر,رجالي,شرقي,نيش,موسمي,أداء قوي,600",
      ]),
      { mode: "apply", createMissing: true, imageExists },
    );
    expect(plan.refusals[0].reason).toContain("season");
  });
});

// ─── Round trip ─────────────────────────────────────────────────────────────

describe("round trip", () => {
  it("export → import --dry-run shows zero changes", () => {
    const products = [
      makeProduct({
        concentration: "edp",
        family: "woody",
        notes: { top: ["هيل"], middle: ["ورد"], base: [] },
        hidden: true,
        internalNote: "ملاحظة داخلية",
        sizes: [
          { label: "50 مل", price: 500, inStock: true, ml: 50 },
          { label: "100 مل", price: 900, inStock: false, ml: 100 },
        ],
      }),
    ];

    const exported = `\uFEFF${buildCsv(masterCsvRows(products))}`;
    const plan = planMasterImport(products, exported, { mode: "dry-run" });

    expect(plan.changes).toEqual([]);
    expect(plan.rejections).toEqual([]);
    expect(plan.unknownSlugs).toEqual([]);
  });

  it("writes the columns in contract order with a header", () => {
    const rows = masterCsvRows([makeProduct()]);
    expect(rows[0]).toEqual([...MASTER_COLUMNS]);
    expect(rows[1][0]).toBe("pf001");
    expect(rows[1][3]).toBe("نعم");
  });

  it("quotes only cells that need it and round-trips Arabic", () => {
    expect(toCsvCell("plain")).toBe("plain");
    expect(toCsvCell("a,b")).toBe('"a,b"');
    expect(parseCsv(buildCsv([["slug", "top_notes"], ["pf001", "هيل|عود"]])).rows[0]).toEqual([
      "pf001",
      "هيل|عود",
    ]);
  });
});

// ─── Status ─────────────────────────────────────────────────────────────────

describe("status report", () => {
  it("counts filled fields and hidden products", () => {
    const rows = summariseMasterStatus([
      makeProduct({ hidden: true, concentration: "edp" }),
      makeProduct({ slug: "pf002" }),
    ]);

    const byField = Object.fromEntries(rows.map((row) => [row.field, row.filled]));
    expect(byField["on_site (hidden)"]).toBe(1);
    expect(byField["on_site (visible)"]).toBe(1);
    expect(byField.concentration).toBe(1);
    expect(rows.every((row) => row.total === 2)).toBe(true);
  });

  it("renders a markdown table with Arabic and English headers", () => {
    const md = renderMasterStatusMarkdown([makeProduct()], "2026-10-24");
    expect(md).toContain("2026-10-24");
    expect(md).toContain("| concentration | 0 | 1 | 0% |");
  });
});
