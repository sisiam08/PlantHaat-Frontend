import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Fixed page action bar. Sits above the floating bottom nav and reserves no
 * space by itself — the page container adds `.flowbar-space` so content is
 * never hidden behind it. Callers choose the breakpoint (`lg:hidden` on cart,
 * `md:hidden` on PDP/checkout).
 */
export function FixedBar({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      data-flowbar
      role="region"
      aria-label={label}
      className={cn(
        "fixed inset-x-0 z-40 border-t border-border bg-card/95 px-4 pt-3 shadow-[0_-8px_24px_-16px_rgb(11_33_22_/_0.35)] backdrop-blur-md",
        className,
      )}
      style={{ bottom: 0, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3">{children}</div>
    </div>
  );
}
