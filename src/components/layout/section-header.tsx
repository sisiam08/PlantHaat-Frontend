import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The single home-section heading row: title, optional subtitle, and one
 * right-aligned action. The action keeps a 44px target and the same position
 * and typography on every section.
 */
export function SectionHeader({
  id,
  title,
  subtitle,
  action,
  actionAriaLabel,
  className,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { href: string; label: ReactNode };
  actionAriaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1",
        className,
      )}
    >
      <div className="grid min-w-0 gap-1">
        <h2
          id={id}
          data-section-heading
          className="font-heading text-2xl font-semibold md:text-3xl"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          aria-label={actionAriaLabel}
          data-section-action
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {action.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
