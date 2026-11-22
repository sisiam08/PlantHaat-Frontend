import { cn } from "@/lib/utils";

/** Skeletons match the final content box so nothing shifts when data lands. */
export function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border border-border/60 bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-7 w-32 animate-pulse rounded bg-muted" />
      <div className="h-7 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export function ChartSkeleton({ className, height = 220 }: { className?: string; height?: number }) {
  return (
    <div
      className={cn("grid gap-3 rounded-2xl border border-border/60 bg-card p-4", className)}
      aria-hidden
    >
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-64 animate-pulse rounded bg-muted" />
      <div className="w-full animate-pulse rounded-xl bg-muted" style={{ height }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn("grid gap-2 rounded-2xl border border-border/60 bg-card p-4", className)}
      aria-hidden
    >
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-9 w-full animate-pulse rounded bg-muted/70" />
      ))}
    </div>
  );
}
