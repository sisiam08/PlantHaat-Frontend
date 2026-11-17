"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during the hydration pass, true afterwards.
 * Used to keep native form submission inert until React can handle submit,
 * so a click before hydration can never post credentials to the page URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
