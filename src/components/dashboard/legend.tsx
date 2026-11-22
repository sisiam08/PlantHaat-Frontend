import { cn } from "@/lib/utils";

import { chartColor, chartMarker, type ChartMarker } from "./chart-palette";

function Marker({ shape, color }: { shape: ChartMarker; color: string }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden focusable="false">
      {shape === "square" ? <rect x={2} y={2} width={8} height={8} rx={1} fill={color} /> : null}
      {shape === "triangle" ? <path d="M6 1.5 10.5 10.5H1.5Z" fill={color} /> : null}
      {shape === "diamond" ? <path d="M6 1 11 6l-5 5-5-5Z" fill={color} /> : null}
      {shape === "cross" ? (
        <path d="M4 2h4v2h2v4H8v2H4V8H2V4h2Z" fill={color} />
      ) : null}
      {shape === "circle" ? <circle cx={6} cy={6} r={4.5} fill={color} /> : null}
    </svg>
  );
}

export interface LegendItem {
  label: string;
  value?: string;
  colorIndex?: number;
}

/**
 * Chart legend with a colour swatch + a shape marker, so the same series can be
 * identified without relying on colour vision.
 */
export function Legend({
  items,
  className,
  onToggle,
  hiddenKeys,
}: {
  items: LegendItem[];
  className?: string;
  onToggle?: (index: number) => void;
  hiddenKeys?: Set<number>;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs", className)}>
      {items.map((item, index) => {
        const colorIndex = item.colorIndex ?? index;
        const color = chartColor(colorIndex);
        const hidden = hiddenKeys?.has(index) ?? false;
        const content = (
          <>
            <Marker shape={chartMarker(colorIndex)} color={color} />
            <span className={cn("text-muted-foreground", hidden && "line-through opacity-60")}>
              {item.label}
            </span>
            {item.value ? <span className="font-medium tabular-nums">{item.value}</span> : null}
          </>
        );
        return (
          <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {onToggle ? (
              <button
                type="button"
                onClick={() => onToggle(index)}
                aria-pressed={!hidden}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {content}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5">{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
