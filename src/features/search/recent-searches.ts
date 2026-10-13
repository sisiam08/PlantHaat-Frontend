"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "planthaat.recentSearches";
const MAX_ENTRIES = 8;
const CHANGE_EVENT = "planthaat-recent-searches";

const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cached: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const cleaned = parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_ENTRIES);
    return cleaned.length > 0 ? cleaned : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Stable snapshot for `useSyncExternalStore` (same reference until storage changes). */
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") {
    return EMPTY;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === cachedRaw) {
    return cached;
  }
  cachedRaw = raw;
  cached = parse(raw);
  return cached;
}

function emit(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function persist(items: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
  emit();
}

export function rememberSearch(query: string): void {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const next = [trimmed, ...getRecentSearches().filter((item) => item !== trimmed)];
  persist(next);
}

export function removeRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  persist(getRecentSearches().filter((item) => item !== query));
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  persist([]);
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, getRecentSearches, () => EMPTY);
}
