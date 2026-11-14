"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Horizontal snap rail with desktop-only arrow controls. */
export function RailScroller({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const element = ref.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-3 md:px-0 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="absolute top-1/2 -left-4 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-input bg-card/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid"
      >
        <ChevronLeft aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="absolute top-1/2 -right-4 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-input bg-card/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid"
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

