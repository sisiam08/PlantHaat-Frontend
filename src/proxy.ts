import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/cookie-names";
import { accessTokenExpiresAt, decodeAccessToken } from "@/server/jwt";
import { refreshSession } from "@/server/refresh";

const REFRESH_SKEW_MS = 30_000;

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

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (isPrefetch(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const expiresAt = accessTokenExpiresAt(accessToken);
  const needsRefresh = !accessToken || (expiresAt !== undefined && expiresAt - Date.now() <= REFRESH_SKEW_MS);

  let rotated = false;
  if (needsRefresh && refreshToken) {
    try {
      const tokens = await refreshSession(refreshToken);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      rotated = true;
    } catch {
      return loginRedirect(request);
    }
  }

  if (!accessToken && !refreshToken) {
    return loginRedirect(request);
  }

  const role = accessToken ? decodeAccessToken(accessToken)?.role : undefined;
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }
  if (pathname.startsWith("/seller") && role !== "SELLER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", cookieHeaderWith(request, { access: accessToken, refresh: refreshToken }));

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (rotated && accessToken && refreshToken) {
    response.cookies.set(ACCESS_COOKIE, accessToken, { ...cookieOptions(), maxAge: 15 * 60 });
    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      ...cookieOptions(),
      maxAge: 30 * 24 * 60 * 60,
    });
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
  ],
};
