import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ProgressBar } from "./progress";
import { Sparkline } from "./sparkline";

type Meaning = "good" | "bad" | "neutral";

export interface KpiDelta {
  /** Percent change; null when there is no comparable previous period. */
  value: number | null;
  /** Optional explicit direction; inferred from value when omitted. */
  direction?: "up" | "down" | "flat";
  /** Whether the change is good or bad for the business (not just up/down). */
  meaning?: Meaning;
  /** e.g. "vs previous 30 days" */
  label: string;
}

const MEANING_CLASS: Record<Meaning, string> = {
  good: "text-success",
  bad: "text-offer",
  neutral: "text-muted-foreground",
};

function directionOf(delta: KpiDelta): "up" | "down" | "flat" {
  if (delta.direction) return delta.direction;
  if (delta.value === null || delta.value === 0) return "flat";
  return delta.value > 0 ? "up" : "down";
}

/**
 * KPI card: label, value, delta vs the previous period, optional sparkline and
 * target progress. The delta always pairs an arrow + sign + text; colour is an
 * accent, never the only signal.
 */
export function KpiCard({
  label,
  value,
  delta,
  sparkline,
  href,
  target,
  footnote,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  sparkline?: number[];
  href?: string;
  target?: { value: number; max: number; label: string; valueText: string };
  footnote?: string;
  className?: string;
}) {
  const direction = delta ? directionOf(delta) : "flat";
  const meaning = delta?.meaning ?? "neutral";
  const DeltaIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;
  const deltaText =
    delta?.value === null || delta?.value === undefined
      ? "—"
      : `${delta.value > 0 ? "+" : ""}${delta.value.toFixed(1)}%`;

  const body = (
    <div className="grid gap-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-bold tracking-normal tabular-nums">{value}</p>
      {delta ? (
        <p className="flex flex-wrap items-center gap-1 text-xs">
          <span
            className={cn("inline-flex items-center gap-0.5 font-semibold", MEANING_CLASS[meaning])}
          >
            <DeltaIcon aria-hidden className="size-3.5" />
            <span>{deltaText}</span>
          </span>
          <span className="text-muted-foreground">{delta.label}</span>
        </p>
      ) : footnote ? (
        <p className="text-xs text-muted-foreground">{footnote}</p>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <Sparkline
          values={sparkline}
          tone={meaning === "good" ? "success" : meaning === "bad" ? "offer" : "primary"}
        />
      ) : null}
      {target ? (
        <ProgressBar
          label={target.label}
          value={target.value}
          max={target.max}
          valueText={target.valueText}
          tone={target.value / Math.max(1, target.max) >= 0.8 ? "offer" : "primary"}
          className="pt-1"
        />
      ) : null}
    </div>
  );

  const shell = cn(
    "rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]",
    href && "transition-colors hover:border-primary/40",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
