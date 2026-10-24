import { describe, it, expect } from "vitest";
import { availabilityRank, orderForCatalog } from "./catalog-order";
import type { Product } from "@/types";

function product(
  id: string,
  overrides: Partial<
    Pick<Product, "image" | "inStock" | "status" | "sizes">
  > = {},
): Product {
  return {
    id,
    sku: id,
    slug: id.toLowerCase(),
    name: id,
    brand: "Parfums De Foda",
    description: "",
    image: `/products/${id}.png`,
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
    sizes: [{ label: "50 مل", price: 500, inStock: true }],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

describe("availabilityRank", () => {
  it("ranks a buyable product first", () => {
    expect(availabilityRank(product("a"))).toBe(0);
  });

  it("ranks a sold-out product second", () => {
    expect(
      availabilityRank(
        product("b", {
          inStock: false,
          sizes: [{ label: "50 مل", price: 500, inStock: false }],
        }),
      ),
    ).toBe(1);
  });

  it("puts a photo-pending product last, even if it is also sold out", () => {
    expect(
      availabilityRank(
        product("c", {
          image: "/products/placeholder-unavailable.webp",
          inStock: false,
        }),
      ),
    ).toBe(2);
  });
});

describe("orderForCatalog", () => {
  it("sinks sold-out products below the buyable ones, stably", () => {
    const list = [
      product("sold-1", { inStock: false }),
      product("live-1"),
      product("sold-2", { inStock: false }),
      product("live-2"),
    ];

    expect(orderForCatalog(list).map((p) => p.id)).toEqual([
      "live-1",
      "live-2",
      "sold-1",
      "sold-2",
    ]);
  });

  it("puts coming-soon products after sold-out ones", () => {
    const list = [
      product("soon", { image: "/products/placeholder-unavailable.webp" }),
      product("sold", { inStock: false }),
      product("live"),
    ];

    expect(orderForCatalog(list).map((p) => p.id)).toEqual([
      "live",
      "sold",
      "soon",
    ]);
  });

  it("leaves an already-ordered catalogue untouched", () => {
    const list = [product("a"), product("b")];
    expect(orderForCatalog(list).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("does not mutate its input", () => {
    const list = [product("sold", { inStock: false }), product("live")];
    const copy = [...list];
    orderForCatalog(list);
    expect(list).toEqual(copy);
  });
});
