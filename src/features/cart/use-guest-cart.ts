"use client";

import { useSyncExternalStore } from "react";

import { readGuestCart, subscribeGuestCart, type GuestCartLine } from "./guest-cart";

const EMPTY: GuestCartLine[] = [];

export function useGuestCart(): GuestCartLine[] {
  return useSyncExternalStore(subscribeGuestCart, readGuestCart, () => EMPTY);
}
