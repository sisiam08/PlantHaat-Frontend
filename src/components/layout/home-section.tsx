import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One home section contract: the page container, tokenized top rhythm
 * (32/48/64px at mobile/tablet/desktop) and an optional full-width band.
 * Sections are direct children of the page; their own top padding is the
 * only gap between consecutive sections.
 */
export function HomeSection({
  children,
  className,
  labelledBy,
  ariaLabel,
  id,
  band = "none",
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  ariaLabel?: string;
  id?: string;
  band?: "none" | "cream";
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      data-home-section
      className={cn("w-full", band === "cream" && "bg-secondary/35")}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 pt-8 md:pt-12 lg:pt-16",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
