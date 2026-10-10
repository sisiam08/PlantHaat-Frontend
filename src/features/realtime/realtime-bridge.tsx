"use client";

import { useRealtime } from "./use-realtime";

/** Mounts the realtime socket once, app-wide (renders nothing). */
export function RealtimeBridge() {
  useRealtime();
  return null;
}
