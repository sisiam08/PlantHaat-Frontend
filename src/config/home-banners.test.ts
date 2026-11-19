import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { HOME_BANNERS } from "./home-banners";

describe("home banner assets", () => {
  it("references files that exist in public/", () => {
    for (const banner of HOME_BANNERS) {
      for (const path of [banner.image.desktop, banner.image.mobile]) {
        expect(existsSync(resolve(process.cwd(), "public", path.replace(/^\//, ""))), path).toBe(
          true,
        );
      }
    }
  });
});
