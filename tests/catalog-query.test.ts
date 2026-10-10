import { describe, expect, it } from "vitest";

import { parseProductQuery, productsHref } from "@/features/catalog/query";

describe("parseProductQuery", () => {
  it("parses filters, booleans and sort", () => {
    const query = parseProductQuery({
      q: "monstera",
      category: "indoor-plants",
      minPrice: "200",
      maxPrice: "900",
      inStock: "true",
      isIndoor: "true",
      isPetSafe: "false",
      deliversTo: "3",
      sort: "price_asc",
      page: "2",
    });
    expect(query).toMatchObject({
      q: "monstera",
      category: "indoor-plants",
      minPrice: "200",
      maxPrice: "900",
      inStock: true,
      isIndoor: true,
      deliversTo: 3,
      sort: "price_asc",
      page: 2,
    });
    expect(query.isPetSafe).toBeUndefined();
  });

  it("ignores an invalid sort and invalid numbers", () => {
    const query = parseProductQuery({ sort: "bogus", minPrice: "abc", deliversTo: "-1" });
    expect(query.sort).toBeUndefined();
    expect(query.minPrice).toBeUndefined();
    expect(query.deliversTo).toBeUndefined();
  });
});

describe("productsHref", () => {
  it("builds a shareable query string, dropping empty/boolean-false values", () => {
    expect(productsHref({ q: "rose", inStock: true, page: 2 })).toBe("/products?q=rose&inStock=true&page=2");
    expect(productsHref({ q: "", inStock: false })).toBe("/products");
  });
});
