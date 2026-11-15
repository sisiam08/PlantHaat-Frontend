import { describe, expect, it } from "vitest";

import { tagsForMutation } from "@/server/cache-tags";

describe("tagsForMutation", () => {
  it("maps seller product mutations to the products tag", () => {
    expect(tagsForMutation("/seller/products", "POST")).toContain("products");
    expect(tagsForMutation("/seller/variants/abc/stock", "POST")).toContain("products");
  });

  it("maps banner mutations to home + banners", () => {
    const tags = tagsForMutation("/admin/banners", "POST");
    expect(tags).toContain("home");
    expect(tags).toContain("banners");
  });

  it("maps an admin settings save to the settings tag", () => {
    expect(tagsForMutation("/admin/settings", "PATCH")).toEqual(["settings"]);
  });

  it("ignores GET requests", () => {
    expect(tagsForMutation("/seller/products", "GET")).toEqual([]);
  });

  it("returns no tags for unmapped paths", () => {
    expect(tagsForMutation("/auth/login", "POST")).toEqual([]);
  });
});
