"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { chartColor, chartMarker } from "./chart-palette";
import {
  buildAreaPath,
  buildLinePath,
  buildPoints,
  buildTicks,
  formatCompact,
  niceMax,
  plotHeight,
  shortDayLabel,
  DEFAULT_PLOT,
  type PlotGeometry,
} from "./chart-utils";
import { useChartWidth } from "./use-chart-width";

export interface LineSeries {
  key: string;
  label: string;
  values: number[];
  colorIndex: number;
  variant?: "area" | "line";
  dashed?: boolean;
}

function markerPath(shape: string, x: number, y: number, size = 3.2): string {
  if (shape === "square") return `M${x - size} ${y - size}h${size * 2}v${size * 2}h${-size * 2}Z`;
  if (shape === "triangle") return `M${x} ${y - size * 1.2}L${x + size} ${y + size}H${x - size}Z`;
  if (shape === "diamond") return `M${x} ${y - size * 1.2}L${x + size * 1.2} ${y}L${x} ${y + size * 1.2}L${x - size * 1.2} ${y}Z`;
  if (shape === "cross")
    return `M${x - size} ${y - size / 2}h${size}h${size / 2}v${size}h${-size / 2}v${size / 2}h${-size}v${-size / 2}h${-size / 2}v${-size}h${size / 2}Z`;
  return "";
}

/**
 * Accessible line/area chart. The whole plot is one focus stop; arrow keys move
 * the active point and a live region announces its exact value. Every chart is
 * paired with a text summary and a data table (ChartCard).
 */
export function LineAreaChart({
  labels,
  series,
  summary,
  formatValue = (value) => formatCompact(value),
  height = 240,
  labelFormat = shortDayLabel,
  className,
}: {
  labels: string[];
  series: LineSeries[];
  summary: string;
  formatValue?: (value: number) => string;
  height?: number;
  labelFormat?: (label: string) => string;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [containerRef, measuredWidth] = useChartWidth(DEFAULT_PLOT.width);
  const geometry: PlotGeometry = {
    ...DEFAULT_PLOT,
    width: Math.max(280, measuredWidth),
    height,
    padding: { ...DEFAULT_PLOT.padding },
  };
  const max = useMemo(
    () => niceMax(Math.max(1, ...series.flatMap((entry) => entry.values))),
    [series],
  );
  const ticks = useMemo(() => buildTicks(max, 4), [max]);
  const count = Math.max(...series.map((entry) => entry.values.length), labels.length, 0);
  const activeIndex = active === null ? count - 1 : active;
  const activeLabel = labels[activeIndex];

  const xLabelIndices = useMemo(() => {
    if (count <= 1) return [0];
    const desired = Math.max(2, Math.min(count, count > 10 ? 5 : count));
    const indices = new Set<number>();
    for (let index = 0; index < desired; index += 1) {
      indices.add(Math.round((index * (count - 1)) / (desired - 1)));
    }
    return [...indices].sort((a, b) => a - b);
  }, [count]);

  const announce = `${activeLabel ? labelFormat(activeLabel) : ""}: ${series
    .map((entry) => `${entry.label} ${formatValue(entry.values[activeIndex] ?? 0)}`)
    .join(", ")}`;

  function move(delta: number) {
    setActive((current) => {
      const next = (current ?? count - 1) + delta;
      return Math.max(0, Math.min(count - 1, next));
    });
  }

  if (count === 0) {
    return null;
  }

  const baseline = geometry.padding.top + plotHeight(geometry);
  const activeX =
    count <= 1
      ? geometry.padding.left + (geometry.width - geometry.padding.left - geometry.padding.right) / 2
      : buildPoints(new Array(count).fill(0), max, geometry)[activeIndex]?.x ?? 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        width="100%"
        height={geometry.height}
        className="block w-full touch-none"
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
          } else if (event.key === "Home") {
            event.preventDefault();
            setActive(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setActive(count - 1);
          }
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((tick) => {
          const y = geometry.padding.top + plotHeight(geometry) * (1 - tick / max);
          return (
            <g key={tick}>
              <line
                x1={geometry.padding.left}
                x2={geometry.width - geometry.padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />
              <text
                x={geometry.padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {formatCompact(tick)}
              </text>
            </g>
          );
        })}

        {xLabelIndices.map((index) => {
          const x =
            count <= 1
              ? geometry.padding.left +
                (geometry.width - geometry.padding.left - geometry.padding.right) / 2
              : geometry.padding.left +
                ((geometry.width - geometry.padding.left - geometry.padding.right) * index) /
                  (count - 1);
          return (
            <text
              key={labels[index] ?? index}
              x={x}
              y={geometry.height - 8}
              textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {labelFormat(labels[index] ?? "")}
            </text>
          );
        })}

        {active !== null ? (
          <line
            x1={activeX}
            x2={activeX}
            y1={geometry.padding.top}
            y2={baseline}
            stroke="var(--foreground)"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
        ) : null}

        {series.map((entry) => {
          const points = buildPoints(entry.values, max, geometry);
          const color = chartColor(entry.colorIndex);
          if (entry.variant === "area" && !entry.dashed) {
            return (
              <path
                key={`area-${entry.key}`}
                d={buildAreaPath(points, geometry)}
                fill={color}
                fillOpacity={0.16}
                stroke="none"
              />
            );
          }
          return null;
        })}

        {series.map((entry) => {
          const points = buildPoints(entry.values, max, geometry);
          const color = chartColor(entry.colorIndex);
          const shape = chartMarker(entry.colorIndex);
          const last = points[points.length - 1];
          return (
            <g key={`line-${entry.key}`}>
              <path
                d={buildLinePath(points)}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={entry.dashed ? "6 5" : undefined}
              />
              {last ? (
                <path d={markerPath(shape, last.x, last.y)} fill={color} stroke="var(--card)" strokeWidth={1.5} />
              ) : null}
            </g>
          );
        })}

        {active !== null
          ? series.map((entry) => {
              const point = buildPoints(entry.values, max, geometry)[active];
              if (!point) return null;
              return (
                <circle
                  key={`active-${entry.key}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={chartColor(entry.colorIndex)}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              );
            })
          : null}

        {/* Invisible hover/focus bands for pointer selection. */}        {labels.map((label, index) => {
          const width = (geometry.width - geometry.padding.left - geometry.padding.right) / Math.max(1, count - 1);
          const x = geometry.padding.left + width * index - width / 2;
          return (
            <rect
              key={`band-${label}-${index}`}
              x={Math.max(geometry.padding.left, x)}
              y={geometry.padding.top}
              width={Math.max(2, width)}
              height={plotHeight(geometry)}
              fill="transparent"
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
            />
          );
        })}
      </svg>

      {active !== null ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-1 z-10 grid gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-soft)]"
          style={{ left: `${Math.min(78, Math.max(2, (activeX / geometry.width) * 100))}%` }}
        >
          <span className="font-medium">{activeLabel ? labelFormat(activeLabel) : ""}</span>
          {series.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5 tabular-nums">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: chartColor(entry.colorIndex) }}
              />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{formatValue(entry.values[activeIndex] ?? 0)}</span>
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
