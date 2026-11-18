"use client";

import axios from "axios";

import { broadcastAuth } from "./broadcast";

export type RefreshOutcome = "refreshed" | "no-session" | "transient";
/**
 * One shared browser refresh. Concurrent 401s await the same promise, and a
 * short cross-tab lock (Web Locks where available, localStorage otherwise)
 * stops several tabs from rotating the same refresh token at once. The backend
 * also keeps a grace window, so a rare race still resolves instead of logging
 * the user out.
 */
let inflight: Promise<RefreshOutcome> | null = null;
let noSessionUntil = 0;

const LOCK_NAME = "planthaat-auth-refresh";
const LOCK_KEY = "ph_auth_refresh_lock";
const LAST_REFRESH_KEY = "ph_auth_refresh_at";
const LOCK_TTL_MS = 8_000;
const RECENT_REFRESH_MS = 2_000;
const NO_SESSION_MS = 5_000;

function isAuthUrl(url?: string): boolean {
  return typeof url === "string" && url.startsWith("/auth/");
}

/** Any successful /auth/* response (login, refresh) restarts the retry flow. */
export function markAuthSuccess(url?: string): void {
  if (isAuthUrl(url)) {
    noSessionUntil = 0;
  }
}

export function refreshOnce(): Promise<boolean> {
  return refreshOnceDetailed().then((outcome) => outcome === "refreshed");
}

export function refreshOnceDetailed(): Promise<RefreshOutcome> {
  if (Date.now() < noSessionUntil) {
    return Promise.resolve("no-session");
  }
  if (!inflight) {
    inflight = run().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

const TAB_ID = (() => {
  try {
    const existing = window.sessionStorage.getItem("ph_auth_tab");
    if (existing) return existing;
    const created = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem("ph_auth_tab", created);
    return created;
  } catch {
    return "tab";
  }
})();

function recentlyRefreshedByAnotherTab(): boolean {
  try {
    const raw = window.localStorage.getItem(LAST_REFRESH_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { tabId?: string; at?: number };
    return (
      parsed.tabId !== TAB_ID &&
      typeof parsed.at === "number" &&
      Date.now() - parsed.at < RECENT_REFRESH_MS
    );
  } catch {
    return false;
  }
}

function markRefreshed(): void {
  try {
    window.localStorage.setItem(
      LAST_REFRESH_KEY,
      JSON.stringify({ tabId: TAB_ID, at: Date.now() }),
    );
  } catch {
    // Ignore storage failures.
  }
}

interface LockRecord {
  id: string;
  at: number;
}

function tryAcquireLock(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (raw) {
      const existing = JSON.parse(raw) as LockRecord;
      if (
        existing &&
        typeof existing.at === "number" &&
        Date.now() - existing.at < LOCK_TTL_MS
      ) {
        return false;
      }
    }
    window.localStorage.setItem(LOCK_KEY, JSON.stringify({ id, at: Date.now() }));
    return true;
  } catch {
    return true;
  }
}

function releaseLock(id: string): void {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return;
    const existing = JSON.parse(raw) as LockRecord;
    if (existing?.id === id) {
      window.localStorage.removeItem(LOCK_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, task);
  }
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 4_000) {
    if (tryAcquireLock(id)) {
      try {
        return await task();
      } finally {
        releaseLock(id);
      }
    }
    await delay(100);
  }
  // The holder may be gone; the backend grace window still protects us.
  return task();
}

async function run(): Promise<RefreshOutcome> {
  return withRefreshLock(async () => {
    if (recentlyRefreshedByAnotherTab()) {
      // Another tab just refreshed the shared cookie jar.
      return "refreshed";
    }
    try {
      const response = await axios.post("/api/v1/auth/refresh", null, {
        timeout: 15_000,
        withCredentials: true,
      });
      noSessionUntil = 0;
      markRefreshed();
      const expiresAt = (response.data as { data?: { accessTokenExpiresAt?: number } })?.data
        ?.accessTokenExpiresAt;
      broadcastAuth(
        "refresh",
        typeof expiresAt === "number" ? { expiresAt } : {},
      );
      return "refreshed";
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          noSessionUntil = Date.now() + NO_SESSION_MS;
          broadcastAuth("session:expired");
          return "no-session";
        }
      }
      // Network/timeout/5xx: keep the session, retry on the next action.
      return "transient";
    }
  });
}
