"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measure a chart container so SVG user units equal CSS pixels. Without this,
 * a fixed viewBox shrinks axis text and labels on narrow screens.
 */
export function useChartWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
