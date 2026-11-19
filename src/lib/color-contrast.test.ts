import { describe, expect, it } from "vitest";

import {
  blendHex,
  buttonContrast,
  contrastRatio,
  isHexColor,
  overlayContrast,
} from "./color-contrast";

describe("color contrast helpers", () => {
  it("recognises #RRGGBB only", () => {
    expect(isHexColor("#0B2116")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red")).toBe(false);
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#0B2116", "#EFE7D2")).toBeGreaterThan(10);
  });

  it("blends the scrim over a neutral image", () => {
    expect(blendHex("#000000", "#777777", 100)).toBe("#000000");
    expect(blendHex("#000000", "#777777", 0)).toBe("#777777");
  });

  it("warns through low overlay/button contrast", () => {
    expect(overlayContrast("#FFFF00", "#FFFFFF", 95)).toBeLessThan(4.5);
    expect(buttonContrast("#FFFFFF", "#FFFF00")).toBeLessThan(3);
    expect(buttonContrast(null, null)).toBeNull();
  });
});
