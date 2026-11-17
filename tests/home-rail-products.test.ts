import { describe, expect, it } from "vitest";

import {
  curateHomeRailProducts,
  isHomeRailProduct,
} from "@/features/catalog/home-rail-products";

function product(id: string, slug: string, inStock = true) {
  return { id, inStock, category: { slug } };
}

describe("home rail curation", () => {
  it("keeps plants and drops accessories and out-of-stock products", () => {
    const pool = [
      product("1", "indoor-plants"),
      product("2", "pots-planters"),
      product("3", "soil-fertilizer"),
      product("4", "gardening-tools"),
      product("5", "seeds"),
      product("6", "flowering-plants", false),
      product("7", "bonsai"),
    ];

    const selected = curateHomeRailProducts(pool);
    expect(selected.map((item) => item.id)).toEqual(["1", "7"]);
  });

  it("deduplicates ids already shown and inside the pool", () => {
    const pool = [
      product("1", "indoor-plants"),
      product("1", "indoor-plants"),
      product("2", "outdoor-plants"),
      product("3", "fruit-plants"),
    ];

    const selected = curateHomeRailProducts(pool, {
      limit: 2,
      excludeIds: new Set(["2"]),
    });

    expect(selected.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("is a pure predicate so client and server rails agree", () => {
    expect(isHomeRailProduct(product("1", "succulents-cactus"))).toBe(true);
    expect(isHomeRailProduct(product("2", "seeds"))).toBe(false);
    expect(isHomeRailProduct(product("3", "indoor-plants", false))).toBe(false);
  });
});
