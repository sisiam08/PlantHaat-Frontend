import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookie-names";

export { ACCESS_COOKIE, REFRESH_COOKIE };

const MANAGED_COOKIES = new Set([ACCESS_COOKIE, REFRESH_COOKIE]);

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

export function authCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export async function readAuthCookies(): Promise<AuthTokens> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value,
    refreshToken: store.get(REFRESH_COOKIE)?.value,
  };
}

interface ParsedSetCookie {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
}

function parseSetCookie(raw: string): ParsedSetCookie | null {
  const segments = raw.split(";");
  const first = segments[0];
  const eq = first.indexOf("=");
  if (eq === -1) {
    return null;
  }
  const parsed: ParsedSetCookie = {
    name: first.slice(0, eq).trim(),
    value: first.slice(eq + 1).trim(),
  };
  for (const segment of segments.slice(1)) {
    const [rawKey, ...rest] = segment.split("=");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key === "max-age" && value !== "") {
      parsed.maxAge = Number(value);
    } else if (key === "expires" && value !== "") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        parsed.expires = date;
      }
    }
  }
  return parsed;
}

/**
 * Re-issues the backend's ph_at/ph_rt Set-Cookie headers as Next-origin cookies
 * (ignoring the backend's Domain/Path), and drops any other backend cookie.
 */
export function applyBackendSetCookies(upstream: Response, response: NextResponse): void {
  const setCookies = upstream.headers.getSetCookie();
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed || !MANAGED_COOKIES.has(parsed.name)) {
      continue;
    }
    response.cookies.set(parsed.name, parsed.value, {
      ...authCookieOptions(),
      ...(parsed.maxAge !== undefined ? { maxAge: parsed.maxAge } : {}),
      ...(parsed.expires !== undefined ? { expires: parsed.expires } : {}),
    });
  }
}

export function clearAuthCookies(response: NextResponse): void {
  for (const name of MANAGED_COOKIES) {
    response.cookies.set(name, "", { ...authCookieOptions(), maxAge: 0 });
  }
}
