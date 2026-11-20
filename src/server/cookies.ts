import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { ACCESS_COOKIE, LEGACY_ACCESS_COOKIE, LEGACY_REFRESH_COOKIE, LEGACY_REFRESH_PATH, REFRESH_COOKIE } from "./cookie-names";

export { ACCESS_COOKIE, REFRESH_COOKIE };

const BACKEND_TO_WEB: Record<string, string> = {
  ph_at: ACCESS_COOKIE,
  ph_rt: REFRESH_COOKIE,
};

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
    accessToken:
      store.get(ACCESS_COOKIE)?.value ?? store.get(LEGACY_ACCESS_COOKIE)?.value,
    refreshToken:
      store.get(REFRESH_COOKIE)?.value ?? store.get(LEGACY_REFRESH_COOKIE)?.value,
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
 * Re-issues the backend's ph_at/ph_rt Set-Cookie headers as the Next-origin
 * `ph_web_*` cookies (ignoring the backend's Domain/Path), and drops any other
 * backend cookie. Legacy `ph_at`/`ph_rt` duplicates are cleared on both paths.
 */
export function applyBackendSetCookies(upstream: Response, response: NextResponse): void {
  const setCookies = upstream.headers.getSetCookie();
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) {
      continue;
    }
    const name = BACKEND_TO_WEB[parsed.name];
    if (!name) {
      continue;
    }
    const expired =
      parsed.value === "" ||
      parsed.maxAge === 0 ||
      (parsed.expires !== undefined && parsed.expires.getTime() <= Date.now());
    if (expired) {
      response.cookies.set(name, "", { ...authCookieOptions(), maxAge: 0 });
      continue;
    }
    response.cookies.set(name, parsed.value, {
      ...authCookieOptions(),
      ...(parsed.maxAge !== undefined ? { maxAge: parsed.maxAge } : {}),
      ...(parsed.expires !== undefined ? { expires: parsed.expires } : {}),
    });
  }
  clearLegacyCookies(response);
}

/**
 * Removes cookies left by the pre-rename app or by direct API/Swagger use.
 * On localhost both origins share a jar; the API's refresh cookie lives on
 * `/api/v1/auth`, the web one on `/`. Clearing both paths guarantees the
 * browser keeps a single auth session.
 */
export function clearLegacyCookies(response: NextResponse): void {
  response.cookies.set(LEGACY_ACCESS_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", {
    ...authCookieOptions(),
    path: LEGACY_REFRESH_PATH,
    maxAge: 0,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  clearLegacyCookies(response);
}
