import { describe, it, expect } from "vitest";
import products from "../../data/products.json";
import {
  GENDERS,
  HOUSES,
  PERFORMANCES,
  PRODUCT_TYPES,
  SEASONS,
} from "./product-vocabulary";

/**
 * The filter bar builds its options from these lists, so a value that exists
 * in `products.json` but not here would silently show up as a zero-count
 * option — the catalogue would look empty for a filter that has products.
 * The reverse (a list value with no products) is harmless: it is dropped.
 */
describe("product vocabulary covers the data", () => {
  const rows = products as unknown as Array<Record<string, string>>;

  it.each([
    ["gender", GENDERS],
    ["type", PRODUCT_TYPES],
    ["season", SEASONS],
    ["performance", PERFORMANCES],
    ["house", HOUSES],
  ] as const)("every product %s is a known value", (field, values) => {
    const unknown = [
      ...new Set(
        rows
          .map((row) => row[field])
          // `season` is optional now: an absent value is unknown, not invalid.
          .filter(
            (value) =>
              value !== undefined &&
              !(values as readonly string[]).includes(value),
          ),
      ),
    ];
    expect(unknown).toEqual([]);
  });

  // A value may exist in the vocabulary with no product using it (`ربيعي`
  // today): the facet builder drops it, so the only failure mode that matters
  // is data the vocabulary does not know.
  it("keeps the declared lists free of duplicates", () => {
    for (const list of [GENDERS, PRODUCT_TYPES, SEASONS, PERFORMANCES, HOUSES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
