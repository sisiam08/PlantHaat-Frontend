import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { sanitizeReturnTo } from "@/lib/navigation";
import {
  ACCESS_COOKIE,
  AUTH_COOKIE_NAMES,
  LEGACY_ACCESS_COOKIE,
  LEGACY_REFRESH_COOKIE,
  LEGACY_REFRESH_PATH,
  REFRESH_COOKIE,
  SESSION_EXPIRED_COOKIE,
} from "@/server/cookie-names";
import { accessTokenExpiresAt, decodeAccessToken } from "@/server/jwt";
import { RefreshError, refreshSession } from "@/server/refresh";

const REFRESH_SKEW_MS = 30_000;
const DEFAULT_ACCESS_MAX_AGE = 15 * 60;

function readCookie(request: NextRequest, name: string, legacy: string): string | undefined {
  return request.cookies.get(name)?.value ?? request.cookies.get(legacy)?.value;
}

function clearLegacyCookies(response: NextResponse): void {
  response.cookies.set(LEGACY_ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", {
    ...cookieOptions(),
    path: LEGACY_REFRESH_PATH,
    maxAge: 0,
  });
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  clearLegacyCookies(response);
}

function cookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") !== null ||
    request.headers.get("purpose") === "prefetch"
  );
}

function cookieHeaderWith(
  request: NextRequest,
  values: { access?: string; refresh?: string },
): string {
  const parts = request.cookies
    .getAll()
    .filter((cookie) => !AUTH_COOKIE_NAMES.includes(cookie.name as (typeof AUTH_COOKIE_NAMES)[number]))
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  if (values.access) {
    parts.push(`${ACCESS_COOKIE}=${values.access}`);
  }
  if (values.refresh) {
    parts.push(`${REFRESH_COOKIE}=${values.refresh}`);
  }
  return parts.join("; ");
}

function loginRedirect(
  request: NextRequest,
  reason: "session-expired" | "auth-required",
): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
  url.searchParams.set("reason", reason);
  const response = NextResponse.redirect(url);
  clearSessionCookies(response);
  return response;
}

function roleHome(role: string | undefined): string {
  if (role === "ADMIN") {
    return "/admin";
  }
  if (role === "SELLER") {
    return "/seller/dashboard";
  }
  return "/";
}

/**
 * A dead refresh session on a protected page must not bounce to /login. Keep
 * the URL and render the minimal dialog page; after an inline login the same
 * URL renders the real page. Cookies are cleared so the dialog's login writes a
 * clean session.
 */
function markExpiredCookie(response: NextResponse): void {
  response.cookies.set(SESSION_EXPIRED_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function sessionExpiredResponse(request: NextRequest): NextResponse {
  const response = NextResponse.rewrite(new URL("/session-expired", request.url));
  clearSessionCookies(response);
  markExpiredCookie(response);
  return response;
}

function isAuthEntry(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname === "/register/seller" ||
    pathname.startsWith("/register/")
  );
}

function safeAuthReturnTo(request: NextRequest): string | undefined {
  const value =
    request.nextUrl.searchParams.get("next") ??
    request.nextUrl.searchParams.get("returnTo") ??
    request.nextUrl.searchParams.get("callbackUrl");
  const destination = sanitizeReturnTo(value);
  if (!destination) {
    return undefined;
  }
  if (
    destination === "/login" ||
    destination.startsWith("/login?") ||
    destination === "/register" ||
    destination.startsWith("/register?") ||
    destination.startsWith("/auth/")
  ) {
    return undefined;
  }
  return destination;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // The dashboard kit preview is a dev/test tool. Block it before any rendering
  // in production so a prerendered/PPR shell can never answer 200 for /dev.
  if (process.env.NODE_ENV === "production" && request.nextUrl.pathname.startsWith("/dev")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (isPrefetch(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const authEntry = isAuthEntry(pathname);
  let accessToken = readCookie(request, ACCESS_COOKIE, LEGACY_ACCESS_COOKIE);
  let refreshToken = readCookie(request, REFRESH_COOKIE, LEGACY_REFRESH_COOKIE);

  const expiresAt = accessTokenExpiresAt(accessToken);
  const needsRefresh =
    !accessToken ||
    expiresAt === undefined ||
    expiresAt - Date.now() <= REFRESH_SKEW_MS;

  let rotated = false;
  let refreshAccessMaxAge: number | undefined;
  let refreshMaxAge: number | undefined;
  let failedTransiently = false;
  if (needsRefresh && refreshToken) {
    try {
      const tokens = await refreshSession(refreshToken);
      accessToken = tokens.accessToken;
      refreshAccessMaxAge = tokens.accessMaxAgeSeconds;
      refreshMaxAge = tokens.refreshMaxAgeSeconds;
      // Grace-window replies do not rotate the refresh token; keep the cookie
      // the winner already installed in the browser.
      if (tokens.refreshToken) {
        refreshToken = tokens.refreshToken;
      }
      rotated = true;
    } catch (error) {
      if (error instanceof RefreshError && error.kind === "transient") {
        // A backend hiccup is not a logout. Let the page render; server-side
        // session loading retries and surfaces an honest error instead of the
        // login page.
        failedTransiently = true;
      } else if (authEntry) {
        // Invalid/revoked session: clear the dead cookies on a redirect so the
        // browser drops them before rendering the guest form (and never loop).
        const alreadyMarked =
          request.nextUrl.searchParams.get("reason") === "session-expired";
        const returnTo = safeAuthReturnTo(request);
        const target = new URL("/login", request.url);
        if (returnTo) {
          target.searchParams.set("returnTo", returnTo);
        }
        target.searchParams.set("reason", "session-expired");
        const response = alreadyMarked ? NextResponse.next() : NextResponse.redirect(target);
        clearSessionCookies(response);
        return response;
      } else {
        return sessionExpiredResponse(request);
      }
    }
  }

  if (authEntry) {
    if (accessToken && !failedTransiently) {
      const response = NextResponse.redirect(
        new URL(safeAuthReturnTo(request) ?? roleHome(decodeAccessToken(accessToken)?.role), request.url),
      );
      if (rotated) {
        response.cookies.set(ACCESS_COOKIE, accessToken, {
          ...cookieOptions(),
          maxAge: refreshAccessMaxAge ?? DEFAULT_ACCESS_MAX_AGE,
        });
        if (refreshToken && refreshMaxAge !== undefined) {
          response.cookies.set(REFRESH_COOKIE, refreshToken, {
            ...cookieOptions(),
            maxAge: refreshMaxAge,
          });
        }
        clearLegacyCookies(response);
      }
      return response;
    }
    return NextResponse.next();
  }

  if (!accessToken && !refreshToken) {
    // A browser that had a session before gets "expired"; a first-time guest
    // gets the ordinary login-required redirect. Public pages never reach this
    // matcher.
    if (request.cookies.get(SESSION_EXPIRED_COOKIE)?.value === "1") {
      return sessionExpiredResponse(request);
    }
    return loginRedirect(request, "auth-required");
  }
  if (!accessToken && failedTransiently) {
    const pending = NextResponse.next();
    pending.headers.set("x-auth-refresh", "transient");
    return pending;
  }
  if (!accessToken && !rotated) {
    return sessionExpiredResponse(request);
  }

  const role = accessToken ? decodeAccessToken(accessToken)?.role : undefined;
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }
  // Customers may open the seller application while signed in; everything else
  // under /seller needs a seller (or admin) role.
  const isSellerApply = pathname === "/seller/apply" || pathname.startsWith("/seller/apply/");
  if (pathname.startsWith("/seller") && !isSellerApply && role !== "SELLER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    cookieHeaderWith(request, { access: accessToken, refresh: refreshToken }),
  );
  requestHeaders.set("x-pathname", pathname + request.nextUrl.search);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // A live/renewed session clears the expired marker.
  response.cookies.set(SESSION_EXPIRED_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  if (failedTransiently) {
    response.headers.set("x-auth-refresh", "transient");
  }
  if (rotated && accessToken) {
    response.cookies.set(ACCESS_COOKIE, accessToken, {
      ...cookieOptions(),
      maxAge: refreshAccessMaxAge ?? DEFAULT_ACCESS_MAX_AGE,
    });
    if (refreshToken && refreshMaxAge !== undefined) {
      response.cookies.set(REFRESH_COOKIE, refreshToken, {
        ...cookieOptions(),
        maxAge: refreshMaxAge,
      });
    }
    clearLegacyCookies(response);
  }
  return response;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/account/:path*",
    "/wishlist/:path*",
    "/notifications/:path*",
    "/complaints/:path*",
    "/seller/:path*",
    "/admin/:path*",
    "/dev/:path*",
    "/login",
    "/register",
    "/register/seller",
  ],
};
