"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { chartColor } from "./chart-palette";
import { buildTicks, formatCompact, niceMax, plotHeight, plotWidth } from "./chart-utils";
import { useChartWidth } from "./use-chart-width";

export interface BarSeries {
  key: string;
  label: string;
  values: number[];
  colorIndex: number;
}

const WIDTH = 640;
const PADDING = { top: 16, right: 16, bottom: 30, left: 48 };

function texturePath(shape: number): string {
  if (shape === 1) return "M0 6 6 0";
  if (shape === 2) return "M3 3h1v1H3Z";
  if (shape === 3) return "M0 3h6";
  return "M0 6 6 0M0 0l6 6";
}

/**
 * Grouped/stacked vertical bars, or horizontal bars for rankings. Every series
 * carries a texture overlay as well as a colour, and the plot is keyboard
 * navigable with an announced summary.
 */
export function BarChart({
  labels,
  series,
  mode = "grouped",
  orientation = "vertical",
  summary,
  formatValue = (value) => formatCompact(value),
  height = 240,
  className,
}: {
  labels: string[];
  series: BarSeries[];
  mode?: "grouped" | "stacked";
  orientation?: "vertical" | "horizontal";
  summary: string;
  formatValue?: (value: number) => string;
  height?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const [containerRef, measuredWidth] = useChartWidth(WIDTH);
  const width = Math.max(280, measuredWidth);
  const count = Math.max(labels.length, ...series.map((entry) => entry.values.length));
  const activeIndex = active ?? count - 1;
  const max = useMemo(() => {
    if (mode === "stacked" && orientation === "vertical") {
      const totals = Array.from({ length: count }, (_, index) =>
        series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0),
      );
      return niceMax(Math.max(1, ...totals));
    }
    return niceMax(Math.max(1, ...series.flatMap((entry) => entry.values)));
  }, [series, count, mode, orientation]);

  if (count === 0) {
    return null;
  }

  const announce = `${labels[activeIndex] ?? ""}: ${series
    .map((entry) => `${entry.label} ${formatValue(entry.values[activeIndex] ?? 0)}`)
    .join(", ")}`;

  function move(delta: number) {
    setActive((current) => Math.max(0, Math.min(count - 1, (current ?? count - 1) + delta)));
  }

  if (orientation === "horizontal") {
    const entry = series[0];
    const left = Math.min(180, Math.max(64, width * 0.28));
    const maxChars = Math.max(6, Math.floor((left - 10) / 6.2));
    const rowHeight = Math.max(28, Math.min(44, (height - PADDING.top - PADDING.bottom) / count));
    const svgHeight = PADDING.top + PADDING.bottom + rowHeight * count;
    const innerWidth = width - left - PADDING.right;
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <svg
          viewBox={`0 0 ${width} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          className="ph-chart-enter block w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
          }}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            {series.map((row, index) => (
              <pattern
                key={row.key}
                id={`${uid}-tex-${index}`}
                width={6}
                height={6}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={texturePath(row.colorIndex)}
                  stroke="var(--card)"
                  strokeOpacity={0.28}
                  strokeWidth={1.5}
                  fill="none"
                />
              </pattern>
            ))}
          </defs>
          {labels.map((label, index) => {
            const value = entry.values[index] ?? 0;
            const y = PADDING.top + index * rowHeight;
            const barWidth = Math.max(2, (Math.min(value, max) / max) * innerWidth);
            return (
              <g
                key={`${label}-${index}`}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                tabIndex={-1}
              >
                <text
                  x={left - 8}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  fontSize={11.5}
                  fill={active === index ? "var(--foreground)" : "var(--muted-foreground)"}
                >
                  {label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label}
                </text>
                <rect
                  x={left}
                  y={y + rowHeight * 0.22}
                  width={innerWidth}
                  height={rowHeight * 0.56}
                  rx={5}
                  fill="var(--muted)"
                  fillOpacity={0.5}
                />
                <rect
                  x={left}
                  y={y + rowHeight * 0.22}
                  width={barWidth}
                  height={rowHeight * 0.56}
                  rx={5}
                  fill={chartColor(entry.colorIndex)}
                />
                <rect
                  x={left}
                  y={y + rowHeight * 0.22}
                  width={barWidth}
                  height={rowHeight * 0.56}
                  rx={5}
                  fill={`url(#${uid}-tex-${0})`}
                />
                <text
                  x={left + barWidth + 6}
                  y={y + rowHeight / 2 + 4}
                  fontSize={11.5}
                  fill="var(--foreground)"
                  className="tabular-nums"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    );
  }

  const innerWidth = plotWidth({ width, height, padding: PADDING });
  const innerHeight = plotHeight({ width, height, padding: PADDING });
  const band = innerWidth / count;
  const groupCount = series.length;
  const groupWidth = band * 0.72;
  const barWidth = mode === "stacked" ? groupWidth : groupWidth / Math.max(1, groupCount);
  const ticks = buildTicks(max, 4);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="block w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          }
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          {series.map((row, index) => (
            <pattern
              key={row.key}
              id={`${uid}-texv-${index}`}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={texturePath(row.colorIndex)}
                stroke="var(--card)"
                strokeOpacity={0.28}
                strokeWidth={1.5}
                fill="none"
              />
            </pattern>
          ))}
        </defs>
        {ticks.map((tick) => {
          const y = PADDING.top + innerHeight * (1 - tick / max);
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />
              <text
                x={PADDING.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {formatCompact(tick)}
              </text>
            </g>
          );
        })}
        {labels.map((label, index) => {
          let stackY = PADDING.top + innerHeight;
          return (
            <g
              key={`${label}-${index}`}
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
            >
              <rect
                x={PADDING.left + band * index}
                y={PADDING.top}
                width={band}
                height={innerHeight}
                fill={active === index ? "var(--muted)" : "transparent"}
                fillOpacity={0.4}
              />
              {series.map((entry, seriesIndex) => {
                const value = entry.values[index] ?? 0;
                const barHeight = (Math.min(value, max) / max) * innerHeight;
                const x =
                  mode === "stacked"
                    ? PADDING.left + band * index + (band - barWidth) / 2
                    : PADDING.left +
                      band * index +
                      (band - groupWidth) / 2 +
                      barWidth * seriesIndex;
                const y = mode === "stacked" ? stackY - barHeight : PADDING.top + innerHeight - barHeight;
                if (mode === "stacked") stackY = y;
                return (
                  <g key={entry.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(1, barHeight)}
                      rx={5}
                      fill={chartColor(entry.colorIndex)}
                    />
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(1, barHeight)}
                      rx={5}
                      fill={`url(#${uid}-texv-${seriesIndex})`}
                    />
                  </g>
                );
              })}
              <text
                x={PADDING.left + band * index + band / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {label.length > 10 ? `${label.slice(0, 9)}…` : label}
              </text>
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <div className="pointer-events-none absolute top-1 right-1 grid gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-soft)]">
          <span className="font-medium">{labels[active]}</span>
          {series.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5 tabular-nums">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: chartColor(entry.colorIndex) }}
              />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{formatValue(entry.values[active] ?? 0)}</span>
            </span>
          ))}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
