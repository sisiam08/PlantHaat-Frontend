import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { sanitizeReturnTo } from "@/lib/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/cookie-names";
import { accessTokenExpiresAt, decodeAccessToken } from "@/server/jwt";
import { RefreshError, refreshSession } from "@/server/refresh";

const REFRESH_SKEW_MS = 30_000;
const DEFAULT_ACCESS_MAX_AGE = 15 * 60;

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
    .filter((cookie) => cookie.name !== ACCESS_COOKIE && cookie.name !== REFRESH_COOKIE)
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
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
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
  if (isPrefetch(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const authEntry = isAuthEntry(pathname);
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

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
        const response = alreadyMarked
          ? NextResponse.next()
          : NextResponse.redirect(
              new URL("/login?reason=session-expired", request.url),
            );
        response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
        response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
        return response;
      } else {
        return loginRedirect(request, "session-expired");
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
      }
      return response;
    }
    return NextResponse.next();
  }

  if (!accessToken && !refreshToken) {
    return loginRedirect(request, "auth-required");
  }
  if (!accessToken && failedTransiently) {
    const pending = NextResponse.next();
    pending.headers.set("x-auth-refresh", "transient");
    return pending;
  }
  if (!accessToken && !rotated) {
    return loginRedirect(request, "session-expired");
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
    "/login",
    "/register",
    "/register/seller",
  ],
};
