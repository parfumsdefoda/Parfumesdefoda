import { describe, it, expect } from "vitest";
import type { Product } from "@/schemas/product-schema";
import {
  analyseMasterHeader,
  buildCsv,
  catalogueSizes,
  foldArabic,
  masterColumnsFor,
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

  it("reads a size volume from the label without writing it back", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
    });

    expect(plan.products[0].sizes.map((size) => sizeMl(size))).toEqual([10, 50]);
    expect(plan.products[0].sizes.every((size) => size.ml === undefined)).toBe(true);
    expect(plan.changes).toEqual([]);
  });

  it("repairs a stored ml that contradicts its label", () => {
    const wrong = makeProduct({
      sizes: [{ label: "30 مل", price: 300, inStock: true, ml: 50 }],
    });
    const plan = planMasterImport([wrong], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
    });

    expect(plan.products[0].sizes[0].ml).toBe(30);
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

  it("creates a missing size from its price", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,price_100,avail_100", "pf001,900,نعم"]), {
      mode: "sync-commerce",
    });

    expect(plan.rejections).toEqual([]);
    expect(plan.products[0].sizes.find((size) => size.label === "100 مل")).toMatchObject({
      price: 900,
      inStock: true,
      ml: 100,
    });
  });

  it("rejects availability for a size no price creates", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,avail_100", "pf001,نعم"]), {
      mode: "sync-commerce",
    });

    expect(plan.rejections[0].column).toBe("avail_100");
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

  it("creates an oil product from its 12 مل price", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv([
        "slug,sku,name_ar,gender,scent_style,tier,season,performance,is_oil,concentration,price_12,avail_12",
        "pf999,PF999,زيت عود,رجالي,شرقي,نيش,شتوي,أداء قوي,نعم,oil,300,نعم",
      ]),
      { mode: "apply", createMissing: true, imageExists: () => true },
    );

    const created = plan.products.find((product) => product.slug === "pf999");
    expect(created?.sizes).toEqual([{ label: "12 مل", price: 300, inStock: true, ml: 12 }]);
    expect(created?.oily).toBe(true);
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

  it("creates a row whose season cell is blank (season is optional)", () => {
    const [headerLine, dataLine] = creationCsv.split("\r\n");
    const header = headerLine.split(",");
    const cells = dataLine.split(",");
    cells[header.indexOf("season")] = "";

    const plan = planMasterImport([makeProduct()], csv([headerLine, cells.join(",")]), {
      mode: "apply",
      createMissing: true,
      imageExists,
    });

    expect(plan.refusals).toEqual([]);
    expect(plan.creations).toEqual([{ slug: "pf999", name: "عطر جديد" }]);
    const created = plan.products.find((product) => product.slug === "pf999");
    expect(created?.season).toBeUndefined();
  });

  it.each([
    ["name_ar", "name_ar"],
    ["gender", "gender"],
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

  it("writes the columns in contract order, sized for the catalogue", () => {
    expect(catalogueSizes([makeProduct()])).toEqual([50, 10]);
    const rows = masterCsvRows([makeProduct()]);
    expect(rows[0]).toEqual(masterColumnsFor([50, 10]));
    expect(rows[0].slice(0, 3)).toEqual(["slug", "sku", "name_ar"]);
    expect(rows[0].indexOf("price_50")).toBeLessThan(rows[0].indexOf("price_10"));
    expect(rows[0].indexOf("avail_10")).toBeLessThan(rows[0].indexOf("description_ar"));
    expect(rows[1][0]).toBe("pf001");
    expect(rows[1][3]).toBe("نعم");
  });

  it("round-trips oil sizes and never exports the clear token", () => {
    const products = [
      makeProduct({
        sizes: [
          { label: "12 مل", price: 300, inStock: true, ml: 12 },
          { label: "6 مل", price: 200, inStock: false, ml: 6 },
          { label: "3 مل", price: 120, inStock: true, ml: 3 },
        ],
      }),
    ];

    const rows = masterCsvRows(products);
    expect(rows[0]).toEqual(masterColumnsFor([12, 6, 3]));
    expect(rows[1]).not.toContain("-");

    const plan = planMasterImport(products, `\uFEFF${buildCsv(rows)}`, { mode: "dry-run" });
    expect(plan.changes).toEqual([]);
    expect(plan.rejections).toEqual([]);
    expect(plan.header.sizes).toEqual([12, 6, 3]);
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

// ─── Header contract ────────────────────────────────────────────────────────

describe("analyseMasterHeader", () => {
  it("finds every size whatever the column order", () => {
    const report = analyseMasterHeader([
      "slug",
      "price_50",
      "price_12",
      "avail_3",
      "price_100",
      "name_ar",
    ]);

    expect(report.sizes).toEqual([100, 50, 12, 3]);
    expect(report.duplicates).toEqual([]);
    expect(report.unknown).toEqual([]);
  });

  it("lists a duplicate name with both column numbers", () => {
    const report = analyseMasterHeader(["slug", "price_12", "avail_12", "price_12"]);
    expect(report.duplicates).toEqual([{ name: "price_12", columns: [2, 4] }]);
  });

  it("reports unknown columns and ignores empty header cells", () => {
    const report = analyseMasterHeader(["slug", "owner_note", "", "price_10"]);
    expect(report.unknown).toEqual(["owner_note"]);
    expect(report.duplicates).toEqual([]);
  });
});

describe("planMasterImport — header errors", () => {
  it("refuses a duplicate column and names both positions", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["slug,price_50,price_50", "pf001,1,2"]),
      { mode: "sync-commerce" },
    );

    expect(plan.rejections[0]).toMatchObject({
      slug: "(header)",
      column: "price_50",
      line: 1,
    });
    expect(plan.rejections[0].reason).toContain("columns 2 and 3");
    expect(plan.changes).toEqual([]);
    expect(plan.products[0].sizes[1].price).toBe(500);
  });
});

// ─── Generalised sizes ──────────────────────────────────────────────────────

describe("planMasterImport — generalised sizes", () => {
  it("creates a 12 مل oil size and reports a blank avail as out of stock", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,price_12,avail_12", "pf001,300,"]), {
      mode: "sync-commerce",
    });

    expect(plan.products[0].sizes.map((size) => size.label)).toEqual([
      "50 مل",
      "12 مل",
      "10 مل",
    ]);
    expect(plan.products[0].sizes.find((size) => size.label === "12 مل")).toMatchObject({
      price: 300,
      inStock: false,
      ml: 12,
    });
    expect(plan.warnings.some((warning) => warning.message.includes("starts out of stock"))).toBe(
      true,
    );
  });

  it("creates 3, 6 and 12 مل from a single header", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv([
        "slug,price_12,avail_12,price_6,avail_6,price_3,avail_3",
        "pf001,300,نعم,200,نعم,120,نعم",
      ]),
      { mode: "sync-commerce" },
    );

    expect(plan.products[0].sizes.map((size) => size.label)).toEqual([
      "50 مل",
      "12 مل",
      "10 مل",
      "6 مل",
      "3 مل",
    ]);
    expect(plan.products[0].sizes.every((size) => size.inStock)).toBe(true);
  });

  it("never creates a size from availability alone", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,avail_12", "pf001,نعم"]), {
      mode: "sync-commerce",
    });

    expect(plan.rejections[0].column).toBe("avail_12");
    expect(plan.products[0].sizes).toHaveLength(2);
  });

  it("does not create a size during --apply (commerce is gated)", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,price_12", "pf001,300"]), {
      mode: "apply",
    });

    expect(plan.products[0].sizes).toHaveLength(2);
    expect(plan.changes.some((change) => change.field === "sizes.12 مل")).toBe(true);
  });
});

// ─── Flag columns ───────────────────────────────────────────────────────────

describe("planMasterImport — flag columns", () => {
  const featured = makeProduct({ featured: true });

  it("turns a flag off when the cell is blank", () => {
    const plan = planMasterImport([featured], csv(["slug,is_featured", "pf001,"]), {
      mode: "apply",
    });

    expect(plan.products[0].featured).toBe(false);
    expect(plan.flagToggles).toEqual([{ slug: "pf001", field: "featured", to: false }]);
  });

  it("turns a flag off when the cell says لا and on when it says نعم", () => {
    const off = planMasterImport([featured], csv(["slug,is_featured", "pf001,لا"]), {
      mode: "apply",
    });
    expect(off.products[0].featured).toBe(false);

    const on = planMasterImport([makeProduct()], csv(["slug,is_featured", "pf001,نعم"]), {
      mode: "apply",
    });
    expect(on.products[0].featured).toBe(true);
    expect(on.flagToggles).toEqual([{ slug: "pf001", field: "featured", to: true }]);
  });

  it("reports a flip in a dry run without applying it", () => {
    const plan = planMasterImport([featured], csv(["slug,is_featured", "pf001,"]), {
      mode: "dry-run",
    });

    expect(plan.products[0].featured).toBe(true);
    expect(plan.flagToggles).toEqual([{ slug: "pf001", field: "featured", to: false }]);
  });

  it("rejects a flag cell that is neither نعم nor لا", () => {
    const plan = planMasterImport([featured], csv(["slug,is_featured", "pf001,ممكن"]), {
      mode: "apply",
    });
    expect(plan.rejections[0].column).toBe("is_featured");
    expect(plan.products[0].featured).toBe(true);
  });
});

// ─── Clear token ────────────────────────────────────────────────────────────

describe("planMasterImport — the clear token", () => {
  const full = makeProduct({
    concentration: "edp",
    family: "woody",
    notes: { top: ["هيل"], middle: ["ورد"], base: ["عود"] },
    gallery: ["/products/PF001.png", "/products/PF001-2.png"],
  });

  it("clears enrichment fields with -", () => {
    const plan = planMasterImport(
      [full],
      csv(["slug,concentration,family,top_notes,gallery_extra", "pf001,-,-,-,-"]),
      { mode: "apply" },
    );

    const product = plan.products[0];
    expect(product.concentration).toBeUndefined();
    expect(product.family).toBeUndefined();
    expect(product.notes.top).toEqual([]);
    expect(product.gallery).toEqual(["/products/PF001.png"]);
  });

  it("clears the description only with --sync-commerce", () => {
    const apply = planMasterImport([full], csv(["slug,description_ar", "pf001,-"]), {
      mode: "apply",
    });
    expect(apply.products[0].description).toBe("وصف تجريبي");
    expect(
      apply.changes.some((change) => change.field === "description" && change.group === "commerce"),
    ).toBe(true);

    const sync = planMasterImport([full], csv(["slug,description_ar", "pf001,-"]), {
      mode: "sync-commerce",
    });
    expect(sync.products[0].description).toBe("");
  });

  it("is not a number: a - price is still rejected", () => {
    const plan = planMasterImport([full], csv(["slug,price_50", "pf001,-"]), {
      mode: "sync-commerce",
    });
    expect(plan.rejections[0].column).toBe("price_50");
  });
});

// ─── Arabic folding ─────────────────────────────────────────────────────────

describe("planMasterImport — Arabic spelling variants", () => {
  it("folds ى to ي and reports the normalisation", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,gender", "pf001,رجالى"]), {
      mode: "apply",
    });

    expect(plan.rejections).toEqual([]);
    expect(plan.products[0].gender).toBe("رجالي");
    expect(plan.warnings.some((warning) => warning.column === "gender")).toBe(true);
    expect(foldArabic(" شتوى ")).toBe("شتوي");
  });

  it("still rejects a truly unknown value with its line", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,season", "pf001,موسمي"]), {
      mode: "apply",
    });
    expect(plan.rejections[0]).toMatchObject({ column: "season", line: 2 });
  });
});

// ─── Oil ────────────────────────────────────────────────────────────────────

describe("planMasterImport — oil", () => {
  it("sets oily from is_oil", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["slug,is_oil,concentration", "pf001,نعم,oil"]),
      { mode: "apply" },
    );

    expect(plan.products[0].oily).toBe(true);
    expect(plan.products[0].concentration).toBe("oil");
  });

  it("rejects is_oil when the concentration is not an oil", () => {
    const plan = planMasterImport(
      [makeProduct({ concentration: "edp" })],
      csv(["slug,is_oil", "pf001,نعم"]),
      { mode: "apply" },
    );

    expect(plan.rejections[0].column).toBe("is_oil");
    expect(plan.rejections[0].reason).toContain("conflict");
    expect(plan.products[0].oily).toBe(false);
  });

  it("accepts is_oil with an empty concentration", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,is_oil", "pf001,نعم"]), {
      mode: "apply",
    });

    expect(plan.rejections).toEqual([]);
    expect(plan.products[0].oily).toBe(true);
  });
});

// ─── Reports ────────────────────────────────────────────────────────────────

describe("planMasterImport — reports", () => {
  it("lists catalogue products the file does not mention without deleting them", () => {
    const other = makeProduct({ slug: "pf002", sku: "PF002", id: "PF002" });
    const plan = planMasterImport([makeProduct(), other], csv(["slug,name_ar", "pf001,عطر"]), {
      mode: "apply",
    });

    expect(plan.absentFromMaster).toEqual(["pf002"]);
    expect(plan.products).toHaveLength(2);
  });

  it("reports duplicate public names among visible products", () => {
    const variant = makeProduct({ slug: "pf540", sku: "PF540", id: "PF540" });
    const plan = planMasterImport(
      [makeProduct(), variant],
      csv(["slug,on_site", "pf001,نعم", "pf540,نعم"]),
      { mode: "apply" },
    );

    expect(plan.duplicateNames).toEqual([
      { name: "عطر تجريبي", slugs: ["pf001", "pf540"] },
    ]);
  });

  it("ignores an unknown column with a header warning", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["# notes", "slug,owner_note", "pf001,hi"]),
      { mode: "apply" },
    );

    expect(plan.header.unknown).toEqual(["owner_note"]);
    expect(plan.warnings[0]).toMatchObject({ slug: "(header)", line: 2 });
    expect(plan.rejections).toEqual([]);
  });
});

// ─── Placeholder reconciliation ─────────────────────────────────────────────

describe("planMasterImport — placeholder images", () => {
  const placeholder = makeProduct({
    image: "/products/placeholder-unavailable.webp",
    gallery: ["/products/placeholder-unavailable.webp"],
  });

  it("points a placeholder at the real photo that exists on disk", () => {
    const plan = planMasterImport([placeholder], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
      imageExists: (path) => path === "/products/PF001.png",
    });

    expect(plan.imageFixes).toEqual([
      {
        slug: "pf001",
        from: "/products/placeholder-unavailable.webp",
        to: "/products/PF001.png",
      },
    ]);
    expect(plan.products[0].image).toBe("/products/PF001.png");
    expect(plan.products[0].gallery).toEqual(["/products/PF001.png"]);
  });

  it("never touches a product that already has a real image", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
      imageExists: () => true,
    });

    expect(plan.imageFixes).toEqual([]);
  });

  it("leaves a placeholder alone when no photo exists", () => {
    const plan = planMasterImport([placeholder], csv(["slug,on_site", "pf001,نعم"]), {
      mode: "apply",
      imageExists: () => false,
    });

    expect(plan.imageFixes).toEqual([]);
    expect(plan.products[0].image).toBe(placeholder.image);
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

// ─── is_similar / similar links ─────────────────────────────────────────────

describe("planMasterImport — is_similar", () => {
  const other = makeProduct({
    slug: "pf002",
    sku: "PF002",
    id: "PF002",
    name: "عطر آخر",
  });

  it("parses SKUs separated by commas, Arabic commas, pipes and spaces", () => {
    const plan = planMasterImport(
      [makeProduct(), other],
      csv([
        "slug,is_similar",
        "pf001,PF002",
        "pf002, pf001 ",
      ]),
      { mode: "apply" },
    );

    expect(plan.rejections).toEqual([]);
    expect(plan.products[0].similarTo).toEqual(["pf002"]);
    expect(plan.products[1].similarTo).toEqual(["pf001"]);
  });

  it("treats similar_skus as the same column", () => {
    const plan = planMasterImport(
      [makeProduct(), other],
      csv(["slug,similar_skus", "pf001,PF002"]),
      { mode: "apply" },
    );

    expect(plan.header.unknown).toEqual([]);
    expect(plan.products[0].similarTo).toEqual(["pf002"]);
  });

  it("de-duplicates references, keeps the order and caps at six", () => {
    const catalogue = [
      makeProduct(),
      ...Array.from({ length: 8 }, (_, index) =>
        makeProduct({
          slug: `pf00${index + 2}`,
          sku: `PF00${index + 2}`,
          id: `PF00${index + 2}`,
          name: `عطر ${index + 2}`,
        }),
      ),
    ];
    const refs = catalogue
      .slice(1)
      .map((product) => product.sku)
      .join(", ");

    const plan = planMasterImport(
      catalogue,
      csv(["slug,is_similar", `pf001,"PF003,PF002,${refs}"`]),
      { mode: "apply" },
    );

    expect(plan.products[0].similarTo).toEqual([
      "pf003",
      "pf002",
      "pf004",
      "pf005",
      "pf006",
      "pf007",
    ]);
    expect(
      plan.warnings.some((warning) => warning.message.includes("first 6")),
    ).toBe(true);
  });

  it("rejects an unknown SKU and a self-reference with the row line", () => {
    const plan = planMasterImport(
      [makeProduct(), other],
      csv(["slug,is_similar", 'pf001,"PF999,PF001"']),
      { mode: "apply" },
    );

    expect(plan.rejections.map((rejection) => rejection.column)).toEqual([
      "is_similar",
      "is_similar",
    ]);
    expect(plan.rejections[0]).toMatchObject({ line: 2, value: "PF999" });
    expect(plan.rejections[0].reason).toContain("unknown SKU");
    expect(plan.rejections[1].reason).toContain("itself");
    expect(plan.products[0].similarTo).toBeUndefined();
  });

  it("warns (without blocking) about hidden, absent and one-way links", () => {
    const hidden = makeProduct({
      slug: "pf003",
      sku: "PF003",
      id: "PF003",
      name: "مخفي",
      hidden: true,
    });
    const plan = planMasterImport(
      [makeProduct(), hidden, other],
      csv(["slug,is_similar", "pf001,PF003"]),
      { mode: "apply" },
    );

    const messages = plan.warnings.map((warning) => warning.message).join("\n");
    expect(messages).toContain("hidden");
    expect(messages).toContain("absent from this master file");
    expect(messages).toContain("one-way link");
    expect(plan.products[0].similarTo).toEqual(["pf003"]);
  });

  it("clears the links with - and leaves them alone when blank", () => {
    const linked = makeProduct({ similarTo: ["pf002"] });
    const cleared = planMasterImport(
      [linked, other],
      csv(["slug,is_similar", "pf001,-"]),
      { mode: "apply" },
    );
    expect(cleared.products[0].similarTo).toBeUndefined();

    const untouched = planMasterImport(
      [linked, other],
      csv(["slug,is_similar", "pf001,"]),
      { mode: "apply" },
    );
    expect(untouched.products[0].similarTo).toEqual(["pf002"]);
  });
});

// ─── Optional columns and absent products ───────────────────────────────────

describe("planMasterImport — optional columns and absent products", () => {
  it("reports known columns the file does not carry", () => {
    const plan = planMasterImport([makeProduct()], csv(["slug,name_ar", "pf001,عطر"]), {
      mode: "apply",
    });

    expect(plan.header.absent).toContain("season");
    expect(plan.header.absent).toContain("is_similar");
    expect(plan.header.absent).not.toContain("slug");
    expect(plan.rejections).toEqual([]);
  });

  it("tolerates a product whose season is missing (no rejection, no change)", () => {
    const seasonLess = makeProduct({ season: undefined });
    const plan = planMasterImport(
      [seasonLess],
      csv(["slug,name_ar", "pf001,عطر"]),
      { mode: "sync-commerce" },
    );

    expect(plan.rejections).toEqual([]);
    expect(plan.products[0].season).toBeUndefined();
  });

  it("hide-absent hides only the requested absent slugs, never deletes", () => {
    const a = makeProduct({ slug: "pf670", sku: "PF670", id: "PF670" });
    const b = makeProduct({ slug: "pf999", sku: "PF999", id: "PF999" });
    const plan = planMasterImport(
      [makeProduct(), a, b],
      csv(["slug,on_site", "pf001,نعم"]),
      { mode: "apply", hideAbsent: ["pf670"] },
    );

    expect(plan.absentFromMaster).toEqual(["pf670", "pf999"]);
    expect(plan.hiddenByAbsence).toEqual(["pf670"]);
    expect(plan.products).toHaveLength(3);
    expect(plan.products.find((product) => product.slug === "pf670")?.hidden).toBe(true);
    expect(plan.products.find((product) => product.slug === "pf999")?.hidden).toBeUndefined();
  });

  it("hide-absent=true hides every absent product; a dry run changes nothing", () => {
    const absent = makeProduct({ slug: "pf670", sku: "PF670", id: "PF670" });
    const dry = planMasterImport(
      [makeProduct(), absent],
      csv(["slug,on_site", "pf001,نعم"]),
      { hideAbsent: true },
    );
    expect(dry.hiddenByAbsence).toEqual(["pf670"]);
    expect(dry.products.find((product) => product.slug === "pf670")?.hidden).toBeUndefined();

    const applied = planMasterImport(
      [makeProduct(), absent],
      csv(["slug,on_site", "pf001,نعم"]),
      { mode: "apply", hideAbsent: true },
    );
    expect(applied.products.find((product) => product.slug === "pf670")?.hidden).toBe(true);
  });
});

// ─── Round trip ─────────────────────────────────────────────────────────────

describe("master export round trip", () => {
  it("writes the similar column as SKUs and re-imports with zero changes", () => {
    const products = [
      makeProduct({ similarTo: ["pf002"] }),
      makeProduct({
        slug: "pf002",
        sku: "PF002",
        id: "PF002",
        name: "عطر آخر",
        similarTo: ["pf001"],
      }),
    ];
    const rows = masterCsvRows(products);
    const header = rows[0];

    expect(header).toContain("is_similar");
    expect(rows[1][header.indexOf("is_similar")]).toBe("PF002");
    expect(rows[2][header.indexOf("is_similar")]).toBe("PF001");

    const plan = planMasterImport(products, buildCsv(rows), { mode: "sync-commerce" });
    expect(plan.changes.filter((change) => change.field !== "sizes")).toEqual([]);
    expect(plan.rejections).toEqual([]);
  });
});

describe("is_similar — references to a row being created", () => {
  it("resolves a link to a new row in the same file", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv([
        "slug,sku,name_ar,gender,scent_style,tier,performance,price_50,is_similar",
        "pf001,PF001,عطر,رجالي,شرقي,نيش,أداء قوي,600,PF999",
        "pf999,PF999,عطر جديد,رجالي,شرقي,نيش,أداء قوي,500,PF001",
      ]),
      { mode: "apply", createMissing: true, imageExists: () => true },
    );

    expect(plan.rejections).toEqual([]);
    expect(plan.creations).toEqual([{ slug: "pf999", name: "عطر جديد" }]);
    expect(plan.products.find((product) => product.slug === "pf001")?.similarTo).toEqual([
      "pf999",
    ]);
    expect(plan.products.find((product) => product.slug === "pf999")?.similarTo).toEqual([
      "pf001",
    ]);
  });

  it("still rejects a reference to a slug that is nowhere", () => {
    const plan = planMasterImport(
      [makeProduct()],
      csv(["slug,is_similar", "pf001,PF999"]),
      { mode: "apply" },
    );
    expect(plan.rejections[0].reason).toContain("unknown SKU");
  });
});
