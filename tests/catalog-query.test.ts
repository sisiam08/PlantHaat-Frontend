import { describe, expect, it } from "vitest";

import {
  csvToList,
  listToCsv,
  parseProductQuery,
  productsHref,
} from "@/features/catalog/query";

describe("parseProductQuery", () => {
  it("parses filters, booleans and sort", () => {
    const query = parseProductQuery({
      q: "monstera",
      category: "indoor-plants",
      minPrice: "200",
      maxPrice: "900",
      light: "FULL_SUN,SHADE",
      difficulty: "EASY",
      inStock: "true",
      isPetSafe: "false",
      minRating: "4",
      onSale: "true",
      sort: "price_asc",
      page: "2",
    });
    expect(query).toMatchObject({
      q: "monstera",
      category: "indoor-plants",
      minPrice: "200",
      maxPrice: "900",
      light: "FULL_SUN,SHADE",
      difficulty: "EASY",
      inStock: true,
      minRating: "4",
      onSale: true,
      sort: "price_asc",
      page: 2,
    });
    expect(query.isPetSafe).toBeUndefined();
  });

  it("ignores an invalid sort and invalid numbers", () => {
    const query = parseProductQuery({ sort: "bogus", minPrice: "abc", minRating: "abc" });
    expect(query.sort).toBeUndefined();
    expect(query.minPrice).toBeUndefined();
    expect(query.minRating).toBeUndefined();
  });
});

describe("csv helpers", () => {
  it("normalizes and de-duplicates comma-joined values", () => {
    expect(csvToList("B,A,B")).toEqual(["B", "A"]);
    expect(csvToList("")).toEqual([]);
    expect(listToCsv(["B", "A", "B"])).toBe("A,B");
    expect(listToCsv([])).toBeUndefined();
  });
});

describe("productsHref", () => {
  it("builds a shareable query string, dropping empty/boolean-false values", () => {
    expect(productsHref({ q: "rose", inStock: true, page: 2 })).toBe("/products?q=rose&inStock=true&page=2");
    expect(productsHref({ q: "", inStock: false })).toBe("/products");
  });
});
