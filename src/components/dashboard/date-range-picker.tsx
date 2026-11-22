"use client";

import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

import { customBounds, dhakaInputDate, presetBounds, type DateRange, type RangePreset } from "./range";

export interface DateRangeValue extends DateRange {
  preset: RangePreset;
  compare: boolean;
}

const PRESETS: Exclude<RangePreset, "custom">[] = ["today", "7d", "30d", "90d"];

/**
 * Period selector with Today/7d/30d/90d/custom and a compare-to-previous
 * toggle. Dates are Asia/Dhaka calendar days; the API receives ISO instants.
 */
export function DateRangePicker({
  value,
  onChange,
  labels,
  className,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  labels: {
    period: string;
    today: string;
    days7: string;
    days30: string;
    days90: string;
    custom: string;
    from: string;
    to: string;
    compare: string;
  };
  className?: string;
}) {
  const presetLabel: Record<Exclude<RangePreset, "custom">, string> = {
    today: labels.today,
    "7d": labels.days7,
    "30d": labels.days30,
    "90d": labels.days90,
  };

  function choose(preset: Exclude<RangePreset, "custom">) {
    onChange({ ...presetBounds(preset), preset, compare: value.compare });
  }

  const fromDay = dhakaInputDate(value.from);
  const toDay = dhakaInputDate(value.to);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-2",
        className,
      )}
      role="group"
      aria-label={labels.period}
    >
      <span className="inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <CalendarDays aria-hidden className="size-3.5" />
        {labels.period}
      </span>
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => choose(preset)}
          aria-pressed={value.preset === preset}
          className={cn(
            "min-h-8 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value.preset === preset
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {presetLabel[preset]}
        </button>
      ))}
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
      <label className="inline-flex items-center gap-1 text-xs">
        <span className="sr-only sm:not-sr-only sm:text-muted-foreground">{labels.from}</span>
        <input
          type="date"
          value={fromDay}
          max={toDay}
          onChange={(event) =>
            onChange({
              ...customBounds(event.target.value, toDay),
              preset: "custom",
              compare: value.compare,
            })
          }
          className="min-h-8 rounded-lg border border-input bg-background px-2 text-xs tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <label className="inline-flex items-center gap-1 text-xs">
        <span className="sr-only sm:not-sr-only sm:text-muted-foreground">{labels.to}</span>
        <input
          type="date"
          value={toDay}
          min={fromDay}
          onChange={(event) =>
            onChange({
              ...customBounds(fromDay, event.target.value),
              preset: "custom",
              compare: value.compare,
            })
          }
          className="min-h-8 rounded-lg border border-input bg-background px-2 text-xs tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <label className="ms-auto inline-flex min-h-8 items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={value.compare}
          onChange={(event) => onChange({ ...value, compare: event.target.checked })}
          className="size-4 rounded border-input accent-[var(--primary)]"
        />
        {labels.compare}
      </label>
    </div>
  );
}
