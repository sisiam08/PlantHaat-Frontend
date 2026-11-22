/**
 * Pure helpers for the admin/seller dashboard kit. Kept framework-free so the
 * chart math and formatting can be unit-tested without a browser.
 */

export interface ChartPoint {
  label: string;
  value: number;
}

export function toNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Percent change vs a previous value; null when the base is 0. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

/** Round a maximum up to a friendly 1/2/5 × 10^n tick. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Evenly spaced ticks from 0 to the padded maximum (inclusive). */
export function buildTicks(max: number, count = 4): number[] {
  const top = niceMax(max);
  const safeCount = Math.max(1, Math.min(8, Math.floor(count)));
  return Array.from({ length: safeCount + 1 }, (_, index) => (top / safeCount) * index);
}

export interface PlotGeometry {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export const DEFAULT_PLOT: PlotGeometry = {
  width: 640,
  height: 220,
  padding: { top: 16, right: 16, bottom: 28, left: 44 },
};

export function plotWidth(geometry: PlotGeometry): number {
  return Math.max(1, geometry.width - geometry.padding.left - geometry.padding.right);
}

export function plotHeight(geometry: PlotGeometry): number {
  return Math.max(1, geometry.height - geometry.padding.top - geometry.padding.bottom);
}

export function scaleX(index: number, total: number, geometry = DEFAULT_PLOT): number {
  const inner = plotWidth(geometry);
  if (total <= 1) return geometry.padding.left + inner / 2;
  return geometry.padding.left + (inner * index) / (total - 1);
}

export function scaleY(value: number, max: number, geometry = DEFAULT_PLOT): number {
  const inner = plotHeight(geometry);
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  return geometry.padding.top + inner - inner * ratio;
}

/** Points for a polyline / path in plot coordinates. */
export function buildPoints(
  values: number[],
  max: number,
  geometry = DEFAULT_PLOT,
): { x: number; y: number; index: number }[] {
  return values.map((value, index) => ({
    x: scaleX(index, values.length, geometry),
    y: scaleY(value, max, geometry),
    index,
  }));
}

export function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function buildAreaPath(
  points: { x: number; y: number }[],
  geometry = DEFAULT_PLOT,
): string {
  if (points.length === 0) return "";
  const baseline = geometry.padding.top + plotHeight(geometry);
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L${last.x.toFixed(2)} ${baseline.toFixed(2)} L${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

/** Down-sample large series by taking evenly spaced points (keeps the last). */
export function sampleEvenly<T>(items: T[], max: number): T[] {
  if (max <= 0 || items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const sampled: T[] = [];
  for (let index = 0; index < max; index += 1) {
    sampled.push(items[Math.round(index * step)]);
  }
  return sampled;
}

/** Latin-digit compact number for axes: 1.2k / 3.4M / 990. */
export function formatCompact(value: number, locale = "en"): string {
  const numeric = toNumber(value);
  const abs = Math.abs(numeric);
  const format = (scaled: number, suffix: string) => {
    const text = new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
      numberingSystem: "latn",
      maximumFractionDigits: scaled < 10 ? 1 : 0,
    }).format(scaled);
    return `${text}${suffix}`;
  };
  if (abs >= 1_000_000_000) return format(numeric / 1_000_000_000, "B");
  if (abs >= 1_000_000) return format(numeric / 1_000_000, "M");
  if (abs >= 1_000) return format(numeric / 1_000, "k");
  return format(numeric, "");
}

/** Short day label from an ISO date (Asia/Dhaka calendar date string). */
export function shortDayLabel(isoDay: string, locale = "en"): string {
  const [year, month, day] = isoDay.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDay;
  // Noon UTC keeps the Dhaka date stable regardless of the viewer's zone.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
    day: "numeric",
    month: "short",
    numberingSystem: "latn",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
