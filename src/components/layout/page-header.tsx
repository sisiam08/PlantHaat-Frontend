import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one customer-facing page heading: optional breadcrumb/back slot, one h1,
 * optional supporting line and right-aligned actions. The same 24/30px bold
 * scale is used on public, catalog, PDP, checkout, orders and account pages.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  back,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header data-page-header className={cn("grid gap-3", className)}>
      {breadcrumbs ? <div>{breadcrumbs}</div> : null}
      {back ? <div>{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid min-w-0 gap-1.5">
          <h1
            data-page-title
            className="font-heading text-2xl leading-tight font-bold md:text-3xl"
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
