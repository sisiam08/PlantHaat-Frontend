"use client";

import { cn } from "@/lib/utils";

import { chartColor } from "./chart-palette";
import { formatCompact } from "./chart-utils";

export interface DonutSlice {
  label: string;
  value: number;
}

function groupSlices(data: DonutSlice[], maxSlices: number, otherLabel: string): DonutSlice[] {
  if (data.length <= maxSlices) return data;
  const head = data.slice(0, maxSlices);
  const rest = data.slice(maxSlices).reduce((sum, slice) => sum + slice.value, 0);
  return rest > 0 ? [...head, { label: otherLabel, value: rest }] : head;
}

/**
 * Donut for composition (<= 5 named slices + "Other"). The centre shows the
 * total; the legend lists every slice with its exact value and percentage, so
 * the chart never depends on colour alone.
 */
export function DonutChart({
  data,
  maxSlices = 5,
  otherLabel = "Other",
  centerLabel,
  summary,
  formatValue = (value) => formatCompact(value),
  size = 190,
  className,
}: {
  data: DonutSlice[];
  maxSlices?: number;
  otherLabel?: string;
  centerLabel: string;
  summary: string;
  formatValue?: (value: number) => string;
  size?: number;
  className?: string;
}) {
  const slices = groupSlices(
    data.filter((slice) => slice.value > 0),
    maxSlices,
    otherLabel,
  );
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-6", className)}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={summary}
        className="ph-chart-enter shrink-0"
      >
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={14}
        />
        {total > 0
          ? slices.map((slice, index) => {
              const share = slice.value / total;
              const dash = share * circumference;
              const circle = (
                <circle
                  key={`${slice.label}-${index}`}
                  cx={50}
                  cy={50}
                  r={radius}
                  fill="none"
                  stroke={chartColor(index)}
                  strokeWidth={14}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 50 50)"
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return circle;
            })
          : null}
        <text
          x={50}
          y={47}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground)"
        >
          {centerLabel}
        </text>
        <text x={50} y={58} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--foreground)">
          {formatValue(total)}
        </text>
      </svg>
      <ul className="grid min-w-[9rem] gap-1.5 text-xs">
        {slices.length === 0 ? null : (
          slices.map((slice, index) => {
            const share = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <li key={`${slice.label}-${index}`} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: chartColor(index) }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="font-medium tabular-nums">{formatValue(slice.value)}</span>
                <span className="w-10 text-end text-muted-foreground tabular-nums">
                  {share.toFixed(1)}%
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
