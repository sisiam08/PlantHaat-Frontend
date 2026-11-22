import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  detail?: string;
  state: "done" | "current" | "pending" | "failed";
}

const DOT = {
  done: "bg-success",
  current: "bg-cta ring-4 ring-cta/20",
  pending: "bg-muted",
  failed: "bg-offer",
} as const;

/** Compact vertical status timeline used by order/settlement detail screens. */
export function StatusTimeline({
  steps,
  label,
  className,
}: {
  steps: TimelineStep[];
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("grid gap-0", className)}>
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`} className="flex gap-3">
          <span className="flex flex-col items-center">
            <span
              aria-hidden
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[step.state])}
            />
            {index < steps.length - 1 ? (
              <span aria-hidden className="my-1 w-px flex-1 bg-border" />
            ) : null}
          </span>
          <span className="pb-4">
            <span
              className={cn(
                "block text-sm font-medium",
                step.state === "pending" && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {step.detail ? (
              <span className="block text-xs text-muted-foreground tabular-nums">{step.detail}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
