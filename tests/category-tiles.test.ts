import { describe, expect, it } from "vitest";

import {
  categoryTileCount,
  shouldShowAllCategoryTile,
} from "@/features/catalog/category-tiles";

describe("category tile plan", () => {
  it.each([
    [3, true, 4],
    [6, false, 6],
    [7, true, 8],
    [11, true, 12],
    [12, false, 12],
    [13, false, 12],
  ])("count %i -> all tile %s, total %i", (count, showAll, total) => {
    expect(shouldShowAllCategoryTile(count)).toBe(showAll);
    expect(categoryTileCount(count)).toBe(total);
  });

  it("never adds the all tile for an empty list", () => {
    expect(shouldShowAllCategoryTile(0)).toBe(false);
    expect(categoryTileCount(0)).toBe(0);
  });
});
