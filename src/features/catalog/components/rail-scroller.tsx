"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * The single horizontal snap rail: localized region name, 44px arrow controls
 * on pointer widths, and the same scroll/snap/peek behaviour everywhere.
 */
export function RailScroller({
  children,
  label,
  className,
  innerClassName,
  controlsClassName,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  innerClassName?: string;
  controlsClassName?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const t = useTranslations("catalog");
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const element = ref.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        tabIndex={0}
        data-rail-scroller
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:gap-3 md:px-0 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          innerClassName,
        )}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={previousLabel ?? `${t("prev")}: ${label}`}
        data-rail-arrow="prev"
        onClick={() => scroll(-1)}
        className={cn(
          "absolute top-1/2 -left-4 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-input bg-card text-foreground shadow-[var(--shadow-soft)] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid",
          controlsClassName,
        )}
      >
        <ChevronLeft aria-hidden />
      </button>
      <button
        type="button"
        aria-label={nextLabel ?? `${t("next")}: ${label}`}
        data-rail-arrow="next"
        onClick={() => scroll(1)}
        className={cn(
          "absolute top-1/2 -right-4 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-input bg-card text-foreground shadow-[var(--shadow-soft)] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid",
          controlsClassName,
        )}
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}
