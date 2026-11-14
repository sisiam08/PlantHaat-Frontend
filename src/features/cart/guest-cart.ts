"use client";

import { MAX_CART_QUANTITY } from "./types";

export interface GuestCartLine {
  variantId: string;
  quantity: number;
  snapshot: {
    productName: string;
    variantName: string;
    slug: string;
    priceDisplay: string;
    unitPrice?: string;
    imageUrl?: string | null;
    shopName?: string | null;
  };
}

const STORAGE_KEY = "ph_guest_cart_v1";
const CHANGE_EVENT = "ph-guest-cart-change";

function isLine(value: unknown): value is GuestCartLine {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as GuestCartLine).variantId === "string" &&
    typeof (value as GuestCartLine).quantity === "number"
  );
}

let cachedRaw: string | null = null;
let cachedLines: GuestCartLine[] = [];

/** Stable snapshot for `useSyncExternalStore` (same reference until storage changes). */
export function readGuestCart(): GuestCartLine[] {
  if (typeof window === "undefined") {
    return cachedLines;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === cachedRaw) {
    return cachedLines;
  }
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedLines = Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    cachedLines = [];
  }
  return cachedLines;
}

function clamp(quantity: number): number {
  return Math.max(1, Math.min(MAX_CART_QUANTITY, Math.round(quantity)));
}

export function writeGuestCart(lines: GuestCartLine[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addGuestLine(line: GuestCartLine): GuestCartLine[] {
  const lines = readGuestCart();
  const existing = lines.find((item) => item.variantId === line.variantId);
  if (existing) {
    existing.quantity = clamp(existing.quantity + line.quantity);
  } else {
    lines.push({ ...line, quantity: clamp(line.quantity) });
  }
  writeGuestCart(lines);
  return lines;
}

export function setGuestQuantity(variantId: string, quantity: number): GuestCartLine[] {
  const next = Math.max(0, Math.min(MAX_CART_QUANTITY, Math.round(quantity)));
  const lines = readGuestCart()
    .map((line) => (line.variantId === variantId ? { ...line, quantity: next } : line))
    .filter((line) => line.quantity > 0);
  writeGuestCart(lines);
  return lines;
}

export function removeGuestLine(variantId: string): GuestCartLine[] {
  const lines = readGuestCart().filter((line) => line.variantId !== variantId);
  writeGuestCart(lines);
  return lines;
}

export function clearGuestCart(): void {
  writeGuestCart([]);
}

export function subscribeGuestCart(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
