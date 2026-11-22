import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const WIDTHS = {
  wide: "max-w-7xl",
  reading: "max-w-5xl",
  form: "max-w-3xl",
  narrow: "max-w-2xl",
} as const;

/**
 * Shared page container for pages rendered inside SiteShell. Keeps horizontal
 * padding, vertical rhythm and the max width tier in one place. Pages that need
 * a different reading width pass `reading`, `form` or `narrow` intentionally.
 */
export function PageContainer({
  children,
  width = "wide",
  className,
  id,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      data-page-container
      className={cn(
        "mx-auto grid w-full grid-cols-1 gap-6 px-4 py-8 lg:py-12",
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
