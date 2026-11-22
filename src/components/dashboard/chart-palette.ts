/**
 * Dashboard chart palette. Uses the existing design tokens (never raw hex) in
 * a colour-blind-safe order: dark forest, info blue, terracotta, sage, then
 * marigold. Every series also gets a pattern + marker so colour is never the
 * only encoding. Marigold is last because it has the lowest contrast on white.
 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--chart-3)",
] as const;

export const CHART_MARKERS = ["circle", "square", "triangle", "diamond", "cross"] as const;

export const CHART_PATTERNS = ["none", "diagonal", "dots", "horizontal", "cross"] as const;

export type ChartMarker = (typeof CHART_MARKERS)[number];
export type ChartPattern = (typeof CHART_PATTERNS)[number];

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function chartMarker(index: number): ChartMarker {
  return CHART_MARKERS[index % CHART_MARKERS.length];
}

export function chartPattern(index: number): ChartPattern {
  return CHART_PATTERNS[index % CHART_PATTERNS.length];
}

export function chartPatternId(scope: string, index: number): string {
  return `${scope}-pattern-${index % CHART_PATTERNS.length}`;
}

/** Slightly darker text-safe tones for direct labels on white cards. */
export function chartTextColor(index: number): string {
  return index % CHART_COLORS.length === 4 ? "var(--foreground)" : chartColor(index);
}
