import { describe, it, expect } from "vitest";
import {
  cardBadge,
  cardMetaLine,
  cardMetaParts,
  cardPrice,
  hasPremiumInName,
  hasProductImage,
  isPremiumProduct,
  lowestInStockPrice,
  quickAddMode,
  sizeMlFromLabel,
} from "./card-presentation";
import { publicTierLabel, PUBLIC_TIER_LABELS } from "./product-labels";
import type { Product } from "@/types";

// ─── Fixtures ───────────────────────────────────────────────────────────────

type CardProduct = Pick<
  Product,
  "name" | "image" | "inStock" | "status" | "featured" | "sizes" | "house" | "type" | "oily"
> &
  Partial<Pick<Product, "concentration">>;

const PHOTO = "/products/PF020.png";
const PLACEHOLDER = "/products/placeholder-unavailable.webp";

function product(overrides: Partial<CardProduct> = {}): CardProduct {
  return {
    name: "عطر تجريبي",
    image: PHOTO,
    inStock: true,
    status: "active",
    featured: false,
    oily: false,
    house: "نيش",
    type: "شرقي",
    sizes: [
      { label: "50 مل", price: 500, inStock: true },
      { label: "100 مل", price: 700, inStock: true },
    ],
    ...overrides,
  };
}

// ─── Badge priority ─────────────────────────────────────────────────────────

describe("cardBadge", () => {
  it("shows nothing on a normal in-stock product", () => {
    expect(cardBadge(product())).toBeNull();
  });

  it("never shows a premium badge — premium is the frame now", () => {
    expect(cardBadge(product({ featured: true }))).toBeNull();
  });

  it("shows out-of-stock on a premium product that cannot be bought", () => {
    expect(cardBadge(product({ featured: true, inStock: false }))).toBe("out-of-stock");
  });

  it("treats a product with no purchasable size as out of stock", () => {
    expect(
      cardBadge(
        product({
          sizes: [
            { label: "50 مل", price: 500, inStock: false },
            { label: "100 مل", price: 700, inStock: false },
          ],
        }),
      ),
    ).toBe("out-of-stock");
  });

  it("treats a non-active status as out of stock", () => {
    expect(cardBadge(product({ status: "archived" }))).toBe("out-of-stock");
  });

  it("puts the coming-soon placeholder above everything else", () => {
    expect(cardBadge(product({ image: PLACEHOLDER, featured: true, inStock: false }))).toBe(
      "coming-soon",
    );
  });

  it("keeps the name suffix independent of the frame", () => {
    // The suffix is only a word in the name: it neither adds a badge nor
    // decides the premium frame (that is `featured`, and nothing else).
    const variant = product({ featured: false, name: "تيروني (فاخر)" });
    expect(hasPremiumInName(variant.name)).toBe(true);
    expect(isPremiumProduct(variant)).toBe(false);
    expect(cardBadge(variant)).toBeNull();

    const base = product({ featured: true, name: "تيروني" });
    expect(hasPremiumInName(base.name)).toBe(false);
    expect(isPremiumProduct(base)).toBe(true);
    expect(cardBadge(base)).toBeNull();
  });
});

describe("isPremiumProduct", () => {
  it("reads the owner's featured flag and nothing else", () => {
    expect(isPremiumProduct({ featured: true })).toBe(true);
    expect(isPremiumProduct({ featured: false })).toBe(false);
  });
});

// ─── Price ──────────────────────────────────────────────────────────────────

describe("lowestInStockPrice", () => {
  it("returns the cheapest purchasable size, not the first one", () => {
    expect(
      lowestInStockPrice(
        product({
          sizes: [
            { label: "100 مل", price: 700, inStock: true },
            { label: "10 مل", price: 120, inStock: true },
            { label: "30 مل", price: 90, inStock: false },
          ],
        }),
      ),
    ).toBe(120);
  });

  it("falls back to the listed prices when nothing is in stock", () => {
    expect(
      lowestInStockPrice(product({ sizes: [{ label: "50 مل", price: 480, inStock: false }] })),
    ).toBe(480);
  });

  it("returns null when the product has no sizes", () => {
    expect(lowestInStockPrice(product({ sizes: [] }))).toBeNull();
  });
});

describe("cardPrice", () => {
  it("prefixes «من» when more than one size exists", () => {
    expect(cardPrice(product())).toEqual({ prefix: "من", amount: 500 });
  });

  it("drops the prefix for a single-size product", () => {
    expect(cardPrice(product({ sizes: [{ label: "50 مل", price: 500, inStock: true }] }))).toEqual({
      prefix: null,
      amount: 500,
    });
  });

  it("returns null when there is no price to show", () => {
    expect(cardPrice(product({ sizes: [] }))).toBeNull();
  });

  it("uses the caller's Arabic prefix", () => {
    expect(cardPrice(product(), "يبدأ من")?.prefix).toBe("يبدأ من");
  });
});

// ─── Meta line ──────────────────────────────────────────────────────────────

describe("cardMetaParts", () => {
  it("renders tier and scent style", () => {
    expect(cardMetaParts(product())).toEqual(["نيش", "شرقي"]);
  });

  it("adds the concentration only when the catalogue has one", () => {
    expect(cardMetaParts(product({ concentration: "edp" }))).toEqual([
      "نيش",
      "شرقي",
      "أو دو بارفان",
    ]);
  });

  it("never renders the دووب tier", () => {
    expect(cardMetaParts(product({ house: "دووب" }))).toEqual(["شرقي"]);
    expect(publicTierLabel("دووب")).toBeNull();
  });

  it("keeps the lineup at three parts", () => {
    expect(cardMetaParts(product({ concentration: "oil" })).length).toBe(3);
  });

  it("shows an oil as زيت عطري instead of a concentration code", () => {
    expect(cardMetaParts(product({ oily: true, concentration: "edp" }))).toEqual([
      "نيش",
      "شرقي",
      "زيت عطري",
    ]);
    // The concentration alone is still enough to recognise an oil.
    expect(cardMetaLine(product({ concentration: "oil" }))).toBe("نيش · شرقي · زيت عطري");
  });

  it("joins with a middle dot", () => {
    expect(cardMetaLine(product())).toBe("نيش · شرقي");
  });

  it("returns null when there is nothing to say", () => {
    expect(
      cardMetaLine({
        house: "دووب",
        type: "" as Product["type"],
        concentration: undefined,
        oily: false,
      }),
    ).toBeNull();
  });

  it("leads a premium product with فاخر and keeps three parts", () => {
    expect(cardMetaParts(product({ concentration: "edp" }), { premium: true })).toEqual([
      "فاخر",
      "نيش",
      "شرقي",
    ]);
    expect(cardMetaLine(product({ concentration: "edp" }), { premium: true })).toBe(
      "فاخر · نيش · شرقي",
    );
  });

  it("keeps a premium dupe card at two parts", () => {
    expect(cardMetaParts(product({ house: "دووب" }), { premium: true })).toEqual(["فاخر", "شرقي"]);
  });

  it("leaves a normal card's format part untouched", () => {
    expect(cardMetaParts(product({ concentration: "edp" }))).toEqual([
      "نيش",
      "شرقي",
      "أو دو بارفان",
    ]);
  });

  it("exposes a public label for every tier except دووب", () => {
    expect(Object.keys(PUBLIC_TIER_LABELS)).toEqual(["ديزاينر", "نيش", "دووب"]);
    expect(publicTierLabel("ديزاينر")).toBe("ديزاينر");
    expect(publicTierLabel(undefined)).toBeNull();
  });
});

// ─── Quick add ──────────────────────────────────────────────────────────────

describe("quickAddMode", () => {
  it("hides the control when nothing is in stock", () => {
    expect(quickAddMode([{ inStock: false }])).toBe("hidden");
  });

  it("adds directly when exactly one size is available", () => {
    expect(quickAddMode([{ inStock: true }, { inStock: false }])).toBe("direct");
  });

  it("opens the chooser when several sizes are available", () => {
    expect(quickAddMode([{ inStock: true }, { inStock: true }])).toBe("chooser");
  });
});

describe("hasProductImage", () => {
  it("is true when the product points at a file", () => {
    expect(hasProductImage({ image: "/products/PF020.png" })).toBe(true);
  });

  it("is false when there is nothing to show", () => {
    expect(hasProductImage({ image: "" })).toBe(false);
    expect(hasProductImage({ image: "   " })).toBe(false);
  });
});

describe("sizeMlFromLabel", () => {
  it("reads the volume from the existing label", () => {
    expect(sizeMlFromLabel("50 مل")).toBe(50);
    expect(sizeMlFromLabel("10 مل")).toBe(10);
    expect(sizeMlFromLabel("100 مل")).toBe(100);
    expect(sizeMlFromLabel("50ml")).toBe(50);
  });

  it("returns null when the label carries no volume", () => {
    expect(sizeMlFromLabel("عينة")).toBeNull();
  });
});
