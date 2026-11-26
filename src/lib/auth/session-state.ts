"use client";

import type { Role } from "@/lib/api/types";
import { SESSION_EXPIRED_COOKIE } from "@/server/cookie-names";

/**
 * Non-sensitive UX state: did this browser have a real session, and if so what
 * role? Authorization always comes from the API; this only chooses between a
 * "session expired" and a "login required" prompt. It survives a reload so a
 * previously authenticated customer is not downgraded to a first-time guest.
 */
export type SessionStatus = "guest" | "authenticated" | "expired";

interface PersistedSessionState {
  status: SessionStatus;
  role?: Role;
}

const STORAGE_KEY = "ph_session_state_v1";

const GUEST: PersistedSessionState = { status: "guest" };

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAuthState(): PersistedSessionState {
  if (!canUseStorage()) return GUEST;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return GUEST;
    const parsed = JSON.parse(raw) as Partial<PersistedSessionState>;
    if (parsed.status !== "authenticated" && parsed.status !== "expired") return GUEST;
    return { status: parsed.status, role: parsed.role };
  } catch {
    return GUEST;
  }
}

function writeAuthState(state: PersistedSessionState): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UX-only state; a storage failure must not affect authentication.
  }
}

function writeExpiredCookie(active: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_EXPIRED_COOKIE}=${active ? "1" : ""}; path=/; max-age=${
    active ? 31536000 : 0
  }; samesite=lax`;
}

export function hasExpiredMarker(): boolean {
  if (readAuthState().status === "expired") return true;
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((part) => part === `${SESSION_EXPIRED_COOKIE}=1`);
}

export function rememberAuthenticated(role: Role): void {
  writeAuthState({ status: "authenticated", role });
  writeExpiredCookie(false);
}

export function rememberExpired(role?: Role): void {
  writeAuthState({ status: "expired", role });
  writeExpiredCookie(true);
}

export function rememberGuest(): void {
  writeAuthState(GUEST);
  writeExpiredCookie(false);
}
