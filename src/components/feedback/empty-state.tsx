import { Sprout, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One empty-state surface for every list: icon, cause, and a real next action.
 * First-use vs no-results copy is supplied by the caller (never "No data").
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Sprout,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
        <Icon aria-hidden className="size-7" strokeWidth={1.5} />
      </span>
      <p className="font-heading text-lg font-semibold">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
