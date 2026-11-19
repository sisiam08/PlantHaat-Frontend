import { describe, expect, it } from "vitest";

import { isHighlightPosition, splitPosition } from "./highlights-position";

describe("highlight position mapping", () => {
  it("maps the 3x3 positions", () => {
    expect(splitPosition("TOP_LEFT")).toEqual({ vertical: "top", horizontal: "left" });
    expect(splitPosition("CENTER")).toEqual({ vertical: "center", horizontal: "center" });
    expect(splitPosition("BOTTOM_RIGHT")).toEqual({ vertical: "bottom", horizontal: "right" });
  });

  it("rejects unknown positions", () => {
    expect(isHighlightPosition("TOP_LEFT")).toBe(true);
    expect(isHighlightPosition("CENTER")).toBe(true);
    expect(isHighlightPosition("MIDDLE")).toBe(false);
    expect(isHighlightPosition("TOP_MIDDLE")).toBe(false);
  });
});
