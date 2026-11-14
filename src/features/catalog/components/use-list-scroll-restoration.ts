"use client";

import { useEffect, useRef } from "react";

const STORAGE_PREFIX = "ph_list_scroll_v2:";
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const RESTORE_TIMEOUT_MS = 6000;

interface ScrollSnapshot {
  y: number;
  url: string;
  pages: number;
  cursor: string | null;
  ts: number;
}

/**
 * Restores a list's scroll position after Back. The snapshot is only written
 * when the user opens a product (or the page is hidden), never on scroll, so
 * the browser's return-to-top scroll cannot overwrite the saved position.
 * Loaded pages stay in the React Query cache; the snapshot records how many
 * were loaded for diagnostics and waits for the document to grow before
 * scrolling.
 */
export function useListScrollRestoration({
  storageKey,
  pages,
  cursor,
  ready,
}: {
  storageKey: string;
  pages: number;
  cursor: string | null;
  ready: boolean;
}) {
  const pagesRef = useRef(pages);
  const cursorRef = useRef(cursor);
  const key = `${STORAGE_PREFIX}${storageKey}`;

  pagesRef.current = pages;
  cursorRef.current = cursor;

  useEffect(() => {
    if (typeof history !== "undefined") {
      history.scrollRestoration = "manual";
    }

    const save = () => {
      try {
        const snapshot: ScrollSnapshot = {
          y: window.scrollY,
          url: `${window.location.pathname}${window.location.search}`,
          pages: pagesRef.current,
          cursor: cursorRef.current,
          ts: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(snapshot));
      } catch {
        // Storage can be unavailable (private mode); restoration is optional.
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!/^\/products\/[^/]+\/?$/.test(url.pathname)) return;
      save();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", save);
    };
  }, [key]);

  useEffect(() => {
    if (!ready) return;

    let snapshot: ScrollSnapshot | null = null;
    try {
      const raw = sessionStorage.getItem(key);
      snapshot = raw ? (JSON.parse(raw) as ScrollSnapshot) : null;
    } catch {
      return;
    }
    if (!snapshot) return;

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (snapshot.url !== currentUrl || Date.now() - snapshot.ts > SNAPSHOT_TTL_MS) {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      return;
    }

    let frame = 0;
    let done = false;
    const deadline = performance.now() + RESTORE_TIMEOUT_MS;

    const tick = () => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const tallEnough = maxY + 2 >= snapshot!.y;
      const expired = performance.now() > deadline;

      if (tallEnough || expired) {
        const target = Math.min(snapshot!.y, maxY);
        window.scrollTo(0, target);
        if (Math.abs(window.scrollY - target) <= 4 || expired) {
          done = true;
          try {
            sessionStorage.removeItem(key);
          } catch {}
          return;
        }
      }
      if (!done) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, ready]);
}
