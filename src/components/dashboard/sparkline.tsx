import { cn } from "@/lib/utils";

import { buildLinePath, buildPoints, niceMax } from "./chart-utils";

/** Tiny inline trend line. Decorative: the exact value lives in the KPI text. */
export function Sparkline({
  values,
  className,
  tone = "primary",
  ariaHidden = true,
}: {
  values: number[];
  className?: string;
  tone?: "primary" | "success" | "offer" | "info";
  ariaHidden?: boolean;
}) {
  if (values.length < 2) {
    return <span className={cn("block h-7 w-full", className)} aria-hidden />;
  }
  const max = niceMax(Math.max(...values, 0));
  const points = buildPoints(values, max, {
    width: 100,
    height: 28,
    padding: { top: 3, right: 2, bottom: 3, left: 2 },
  });
  const path = buildLinePath(points);
  const last = points[points.length - 1];
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "offer"
        ? "text-offer"
        : tone === "info"
          ? "text-info"
          : "text-primary";
  return (
    <span className={cn("block", toneClass, className)} aria-hidden={ariaHidden}>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full overflow-visible">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last.x} cy={last.y} r={2.4} fill="currentColor" />
      </svg>
    </span>
  );
}
