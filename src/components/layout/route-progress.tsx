"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const START = 8;
const TRICKLE_MS = 180;
const SAFETY_MS = 15000;
const FADE_MS = 220;

/**
 * Global route-transition progress bar. It starts on any same-origin link
 * click (or back/forward navigation) and completes when the URL actually
 * changes, giving instant feedback even when the destination is slow to
 * render. Purely decorative.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const running = useRef(false);
  const trickle = useRef<number | null>(null);
  const safety = useRef<number | null>(null);
  const fade = useRef<number | null>(null);

  const clearIntervalRef = useCallback(() => {
    if (trickle.current !== null) {
      window.clearInterval(trickle.current);
      trickle.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!running.current) return;
    running.current = false;
    clearIntervalRef();
    if (safety.current !== null) {
      window.clearTimeout(safety.current);
      safety.current = null;
    }
    setProgress(100);
    fade.current = window.setTimeout(() => {
      setVisible(false);
      fade.current = window.setTimeout(() => setProgress(0), FADE_MS);
    }, FADE_MS);
  }, [clearIntervalRef]);

  const begin = useCallback(() => {
    if (running.current) return;
    running.current = true;
    if (fade.current !== null) {
      window.clearTimeout(fade.current);
      fade.current = null;
    }
    setProgress((current) => (current > 0 && current < 100 ? current : START));
    setVisible(true);
    trickle.current = window.setInterval(() => {
      setProgress((current) =>
        current >= 92 ? current : current + Math.max(0.5, (92 - current) * 0.12),
      );
    }, TRICKLE_MS);
    safety.current = window.setTimeout(finish, SAFETY_MS);
  }, [finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      begin();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", begin);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", begin);
    };
  }, [begin]);

  useEffect(() => {
    finish();
  }, [pathname, searchParams, finish]);

  useEffect(() => clearIntervalRef, [clearIntervalRef]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-primary via-primary to-cta transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
