import { describe, expect, it } from "vitest";

import {
  buildAreaPath,
  buildLinePath,
  buildTicks,
  formatCompact,
  formatDelta,
  niceMax,
  pctChange,
  sampleEvenly,
  shortDayLabel,
} from "@/components/dashboard/chart-utils";
import { customBounds, dhakaDateString, presetBounds } from "@/components/dashboard/range";

describe("dashboard chart utilities", () => {
  it("computes percent change and handles a zero base", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
    expect(pctChange(100, 0)).toBeNull();
    expect(formatDelta(12.34)).toBe("+12.3%");
    expect(formatDelta(-3)).toBe("-3.0%");
    expect(formatDelta(null)).toBe("—");
  });

  it("rounds maxima up and builds stable ticks", () => {
    expect(niceMax(87)).toBe(100);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(2800)).toBe(3000);
    expect(niceMax(0)).toBe(1);
    expect(buildTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(buildTicks(230, 2)).toEqual([0, 125, 250]);
  });

  it("builds line/area paths and caps series points", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 10, y: 5 },
    ];
    expect(buildLinePath(points)).toBe("M0.00 10.00 L10.00 5.00");
    expect(buildAreaPath(points, { width: 100, height: 100, padding: { top: 0, right: 0, bottom: 20, left: 0 } })).toBe(
      "M0.00 10.00 L10.00 5.00 L10.00 80.00 L0.00 80.00 Z",
    );
    expect(sampleEvenly([1, 2, 3, 4, 5], 3)).toEqual([1, 3, 5]);
    expect(sampleEvenly([1, 2], 3)).toEqual([1, 2]);
  });

  it("formats compact Latin-digit numbers and short Dhaka dates", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1200)).toBe("1.2k");
    expect(formatCompact(3_400_000)).toBe("3.4M");
    expect(shortDayLabel("2026-11-21")).toMatch(/21/);
  });
});

describe("dashboard date ranges (Asia/Dhaka)", () => {
  it("uses the Dhaka calendar day, not UTC", () => {
    expect(dhakaDateString(new Date("2026-11-21T20:00:00.000Z"))).toBe("2026-11-22");
  });

  it("builds inclusive preset bounds at +06:00", () => {
    const now = new Date("2026-11-22T10:00:00.000Z");
    const today = presetBounds("today", now);
    expect(today).toEqual({
      from: "2026-11-21T18:00:00.000Z",
      to: "2026-11-22T17:59:59.999Z",
    });
    const week = presetBounds("7d", now);
    expect(week.from).toBe("2026-11-15T18:00:00.000Z");
    expect(week.to).toBe("2026-11-22T17:59:59.999Z");
  });

  it("normalizes reversed custom ranges", () => {
    expect(customBounds("2026-11-22", "2026-11-01")).toEqual({
      from: "2026-10-31T18:00:00.000Z",
      to: "2026-11-22T17:59:59.999Z",
    });
  });
});
