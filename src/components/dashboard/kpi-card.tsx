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
  icon,
  featured = false,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  sparkline?: number[];
  href?: string;
  target?: { value: number; max: number; label: string; valueText: string };
  footnote?: string;
  icon?: ReactNode;
  /** One featured metric per view: forest surface, cream text, marigold accent. */
  featured?: boolean;
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
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-xs font-medium",
            featured ? "text-sidebar-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full",
              featured ? "bg-white/10 text-sidebar-foreground" : "bg-secondary text-primary",
            )}
          >
            {icon}
          </span>
        ) : href ? (
          <ArrowUpRight
            aria-hidden
            className={cn("size-4 shrink-0", featured ? "text-sidebar-foreground/60" : "text-muted-foreground")}
          />
        ) : null}
      </div>
      <p
        className={cn(
          "font-heading text-2xl font-bold tracking-normal tabular-nums",
          featured && "text-sidebar-foreground",
        )}
      >
        {value}
      </p>
      {delta ? (
        <p className="flex flex-wrap items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              featured
                ? meaning === "neutral"
                  ? "text-sidebar-foreground/80"
                  : "text-sidebar-foreground"
                : MEANING_CLASS[meaning],
            )}
          >
            <DeltaIcon aria-hidden className="size-3.5" />
            <span>{deltaText}</span>
          </span>
          <span className={featured ? "text-sidebar-foreground/80" : "text-muted-foreground"}>
            {delta.label}
          </span>
        </p>
      ) : footnote ? (
        <p
          className={cn(
            "text-xs",
            featured ? "text-sidebar-foreground/80" : "text-muted-foreground",
          )}
        >
          {footnote}
        </p>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <Sparkline
          values={sparkline}
          tone={featured ? "light" : meaning === "good" ? "success" : meaning === "bad" ? "offer" : "primary"}
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
    "rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-soft)]",
    featured
      ? "border-primary/40 bg-primary text-primary-foreground"
      : "bg-card",
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
