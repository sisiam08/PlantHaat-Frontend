import { NextResponse, type NextRequest } from "next/server";

import { sanitizeReturnTo } from "@/lib/navigation";
import { roleHomePath } from "@/server/auth-entry";
import {
  authCookieOptions,
  clearAuthCookies,
  clearLegacyCookies,
  REFRESH_COOKIE,
  ACCESS_COOKIE,
} from "@/server/cookies";
import { LEGACY_REFRESH_COOKIE } from "@/server/cookie-names";
import { decodeAccessToken } from "@/server/jwt";
import { RefreshError, refreshSession } from "@/server/refresh";

const DEFAULT_ACCESS_MAX_AGE = 15 * 60;
const DEFAULT_REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

function destinationFor(raw: string | null): string | undefined {
  const next = sanitizeReturnTo(raw);
  if (!next) return undefined;
  if (
    next === "/login" ||
    next.startsWith("/login?") ||
    next === "/register" ||
    next.startsWith("/register?") ||
    next.startsWith("/auth/")
  ) {
    return undefined;
  }
  return next;
}

function loginUrl(request: NextRequest, next: string | undefined): URL {
  const url = new URL("/login", request.url);
  if (next) {
    url.searchParams.set("returnTo", next);
  }
  url.searchParams.set("reason", "session-expired");
  return url;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const refreshToken =
    request.cookies.get(REFRESH_COOKIE)?.value ??
    request.cookies.get(LEGACY_REFRESH_COOKIE)?.value;
  const next = destinationFor(request.nextUrl.searchParams.get("next"));
  if (!refreshToken) {
    return NextResponse.redirect(loginUrl(request, next));
  }
  try {
    const tokens = await refreshSession(refreshToken);
    const destination =
      next ?? roleHomePath(decodeAccessToken(tokens.accessToken)?.role);
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      ...authCookieOptions(),
      maxAge: tokens.accessMaxAgeSeconds ?? DEFAULT_ACCESS_MAX_AGE,
    });
    if (tokens.refreshToken) {
      response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
        ...authCookieOptions(),
        maxAge: tokens.refreshMaxAgeSeconds ?? DEFAULT_REFRESH_MAX_AGE,
      });
    }
    clearLegacyCookies(response);
    return response;
  } catch (error) {
    if (error instanceof RefreshError && error.kind === "transient") {
      const retry = new URL(request.url);
      return new NextResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="4"></head><body style="font-family:system-ui;padding:2rem;text-align:center"><p>Temporarily unable to renew your session. Retrying…</p><p><a href="${retry.pathname}${retry.search}">Retry now</a></p></body></html>`,
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "Retry-After": "4",
          },
        },
      );
    }
    const response = NextResponse.redirect(loginUrl(request, next));
    response.headers.set("Cache-Control", "private, no-store");
    clearAuthCookies(response);
    return response;
  }
}
