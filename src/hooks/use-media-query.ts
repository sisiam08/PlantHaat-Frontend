"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void): (() => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

/** Reactive `matchMedia` without a set-state-in-effect. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
