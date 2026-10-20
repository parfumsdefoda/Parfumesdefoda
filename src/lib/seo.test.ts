import { describe, expect, it } from "vitest";
import { buildProductTitle, productPath, stripBrandSuffix } from "./seo";

describe("stripBrandSuffix", () => {
  it("removes a trailing brand suffix", () => {
    expect(stripBrandSuffix("أفريكان ليذر | Parfums De Foda")).toBe("أفريكان ليذر");
  });

  it("tolerates spacing and case differences", () => {
    expect(stripBrandSuffix("أكوا دي جيو|parfums de foda")).toBe("أكوا دي جيو");
    expect(stripBrandSuffix("  الوسام  |  Parfums De Foda  ")).toBe("الوسام");
  });

  it("removes the suffix only once", () => {
    expect(
      stripBrandSuffix("أفريكان ليذر | Parfums De Foda | Parfums De Foda"),
    ).toBe("أفريكان ليذر | Parfums De Foda");
  });

  it("leaves a title without the brand untouched", () => {
    expect(stripBrandSuffix("أفريكان ليذر")).toBe("أفريكان ليذر");
  });

  it("does not strip the brand when it is not at the end", () => {
    expect(stripBrandSuffix("Parfums De Foda — عطور فاخرة")).toBe(
      "Parfums De Foda — عطور فاخرة",
    );
  });

  it("never leaves an empty title when the brand is the whole title", () => {
    expect(stripBrandSuffix("Parfums De Foda")).toBe("");
  });
});

describe("buildProductTitle", () => {
  it("returns the seo title without the brand suffix", () => {
    expect(
      buildProductTitle({
        name: "أفريكان ليذر",
        seo: { title: "أفريكان ليذر | Parfums De Foda" },
      }),
    ).toBe("أفريكان ليذر");
  });

  it("falls back to the product name when seo.title is empty", () => {
    expect(buildProductTitle({ name: "أفريكان ليذر", seo: { title: "" } })).toBe(
      "أفريكان ليذر",
    );
  });

  it("falls back to the product name when there is no seo block", () => {
    expect(buildProductTitle({ name: "أفريكان ليذر" })).toBe("أفريكان ليذر");
  });

  it("keeps a custom seo title", () => {
    expect(
      buildProductTitle({ name: "افريكان", seo: { title: "عطر أفريكان ليذر الشرقي" } }),
    ).toBe("عطر أفريكان ليذر الشرقي");
  });
});

describe("productPath", () => {
  it("builds the product route", () => {
    expect(productPath("pf020")).toBe("/product/pf020");
  });
});
