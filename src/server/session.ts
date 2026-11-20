import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";

import type { PublicUser, Role } from "@/lib/api/types";
import { ApiError } from "@/lib/api/common";
import { serverGet } from "./backend";
import { readAuthCookies } from "./cookies";
import { accessTokenExpiresAt, decodeAccessToken } from "./jwt";

export { accessTokenExpiresAt, decodeAccessToken };

async function loadUser(token: string): Promise<PublicUser> {
  const { data } = await serverGet<PublicUser>("/auth/me", { token });
  return data;
}

function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status >= 500 ||
      error.code === "GATEWAY_UNREACHABLE" ||
      error.code === "GATEWAY_TIMEOUT"
    );
  }
  return false;
}

export const getSession = cache(async (): Promise<PublicUser | null> => {
  const { accessToken, refreshToken } = await readAuthCookies();
  if (!accessToken) {
    if (!refreshToken) return null;
    // Do not refresh here: a Server Component cannot write the rotated refresh
    // cookie, so a silent rotation would leave the browser on a stale token and
    // later trigger reuse detection. The proxy/gateway/client set cookies.
    const requestHeaders = await headers();
    if (requestHeaders.get("x-auth-refresh") === "transient") {
      throw new ApiError("GATEWAY_UNREACHABLE", 502);
    }
    return null;
  }
  try {
    return await loadUser(accessToken);
  } catch (error) {
    if (isTransient(error)) throw error;
    return null;
  }
});

export async function requireSession(roles?: Role[]): Promise<PublicUser> {
  const user = await getSession();
  if (!user) {
    // Renders the segment's unauthorized.tsx at the SAME URL (dialog open);
    // the proxy already rewrites dead-session navigations to /session-expired.
    unauthorized();
  }
  if (roles && roles.length > 0 && !roles.includes(user.role as Role)) {
    redirect("/not-allowed");
  }
  return user;
}
