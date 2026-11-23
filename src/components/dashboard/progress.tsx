import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-cta",
  offer: "bg-offer",
  info: "bg-info",
} as const;

export type ProgressTone = keyof typeof TONES;

/**
 * Bullet/progress bar. Exposes the value to assistive tech via `role="meter"`
 * and shows the exact numbers as text, never colour alone.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  tone = "primary",
  marker,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  valueText?: string;
  tone?: ProgressTone;
  marker?: number;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const markerPercent =
    marker !== undefined ? Math.max(0, Math.min(100, (marker / safeMax) * 100)) : undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        {valueText ? <span className="font-medium tabular-nums">{valueText}</span> : null}
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.max(0, Math.min(safeMax, value))}
        aria-valuetext={valueText}
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn(
            "block h-full w-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none",
            TONES[tone],
          )}
          style={{ transform: `scaleX(${percent / 100})` }}
        />
        {markerPercent !== undefined ? (
          <span
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-foreground/70"
            style={{ left: `${markerPercent}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

const STROKE = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--cta)",
  offer: "var(--offer)",
  info: "var(--info)",
} as const;

/** Half-circle gauge for a single ratio (e.g. COD dues vs limit). */
export function Gauge({
  value,
  max,
  label,
  valueText,
  tone = "primary",
  className,
}: {
  value: number;
  max: number;
  label: string;
  valueText: string;
  tone?: ProgressTone;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const radius = 40;
  const circumference = Math.PI * radius;
  const stroke = 10;
  return (
    <div className={cn("grid justify-items-center gap-1", className)}>
      <svg
        viewBox="0 0 100 58"
        className="ph-chart-enter w-full max-w-[180px]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.max(0, Math.min(safeMax, value))}
        aria-valuetext={valueText}
      >
        <path
          d="M10 50 A40 40 0 0 1 90 50"
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d="M10 50 A40 40 0 0 1 90 50"
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
        />
      </svg>
      <p className="text-sm font-semibold tabular-nums">{valueText}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
