import { cn } from "@/lib/utils";

import { chartColor } from "./chart-palette";

export interface FunnelStage {
  label: string;
  value: number;
}

/**
 * Pipeline/funnel as stage bars (not a misleading polygon). Each stage shows
 * its count and the step conversion; the first stage is the 100% reference.
 */
export function FunnelChart({
  stages,
  summary,
  formatValue = (value) => String(value),
  className,
}: {
  stages: FunnelStage[];
  summary: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...stages.map((stage) => stage.value));
  return (
    <ol aria-label={summary} className={cn("grid gap-2.5", className)}>
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1].value : stage.value;
        const conversion = previous > 0 ? (stage.value / previous) * 100 : 0;
        const share = (stage.value / max) * 100;
        return (
          <li key={`${stage.label}-${index}`} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium">{stage.label}</span>
              <span className="tabular-nums">
                {formatValue(stage.value)}
                {index > 0 ? (
                  <span className="ms-2 text-muted-foreground">
                    {conversion.toFixed(1)}% step
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-6 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full w-full origin-left rounded-md transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${Math.max(0.02, share / 100)})`,
                  backgroundColor: chartColor(index),
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
