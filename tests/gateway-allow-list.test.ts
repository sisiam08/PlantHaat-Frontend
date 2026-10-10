import { describe, expect, it } from "vitest";

import { normalizeApiPath } from "@/server/gateway/allow-list";

describe("normalizeApiPath", () => {
  it("accepts plain relative segments", () => {
    expect(normalizeApiPath(["products"])).toBe("/products");
    expect(normalizeApiPath(["shops", "green-nursery", "products"])).toBe(
      "/shops/green-nursery/products",
    );
  });

  it("rejects traversal and empty segments", () => {
    expect(normalizeApiPath(["..", "admin"])).toBeNull();
    expect(normalizeApiPath(["", "auth"])).toBeNull();
    expect(normalizeApiPath(["products", "..", "..", "auth", "me"])).toBeNull();
    expect(normalizeApiPath([])).toBeNull();
  });

  it("rejects encoded traversal and absolute URLs", () => {
    expect(normalizeApiPath(["%2e%2e", "auth"])).toBeNull();
    expect(normalizeApiPath(["https://evil.example"])).toBeNull();
    expect(normalizeApiPath(["a/b"])).toBeNull();
  });
});
