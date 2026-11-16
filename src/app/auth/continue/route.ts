import { NextResponse, type NextRequest } from "next/server";

import { sanitizeReturnTo } from "@/lib/navigation";
import { roleHomePath } from "@/server/auth-entry";
import { authCookieOptions, REFRESH_COOKIE, ACCESS_COOKIE } from "@/server/cookies";
import { decodeAccessToken } from "@/server/jwt";
import { refreshSession } from "@/server/refresh";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const next = sanitizeReturnTo(request.nextUrl.searchParams.get("next"));
  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  try {
    const tokens = await refreshSession(refreshToken);
    const response = NextResponse.redirect(
      new URL(next ?? roleHomePath(decodeAccessToken(tokens.accessToken)?.role), request.url),
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      ...authCookieOptions(),
      maxAge: 15 * 60,
    });
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...authCookieOptions(),
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(ACCESS_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
    return response;
  }
}
