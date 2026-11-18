import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { PublicUser, Role } from "@/lib/api/types";
import { ApiError } from "@/lib/api/common";
import { serverGet } from "./backend";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookie-names";
import { accessTokenExpiresAt, decodeAccessToken } from "./jwt";
import { RefreshError, refreshSession } from "./refresh";

export { accessTokenExpiresAt, decodeAccessToken };

const REFRESH_SKEW_MS = 30_000;

async function loadUser(token: string): Promise<PublicUser> {
  const { data } = await serverGet<PublicUser>("/auth/me", { token });
  return data;
}

function isTransient(error: unknown): boolean {
  if (error instanceof RefreshError) {
    return error.kind === "transient";
  }
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
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) {
    return null;
  }

  let token = accessToken;
  let didRefresh = false;
  const expiresAt = accessTokenExpiresAt(accessToken);
  const needsRefresh =
    !accessToken || (expiresAt !== undefined && expiresAt - Date.now() <= REFRESH_SKEW_MS);

  if (needsRefresh && refreshToken) {
    try {
      const refreshed = await refreshSession(refreshToken);
      token = refreshed.accessToken;
      didRefresh = true;
    } catch (error) {
      if (isTransient(error)) {
        throw error;
      }
      return null;
    }
  }
  if (!token) {
    return null;
  }

  try {
    return await loadUser(token);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      if (refreshToken && !didRefresh) {
        try {
          const refreshed = await refreshSession(refreshToken);
          return await loadUser(refreshed.accessToken);
        } catch (refreshError) {
          if (isTransient(refreshError)) {
            throw refreshError;
          }
          return null;
        }
      }
      return null;
    }
    if (isTransient(error)) {
      throw error;
    }
    return null;
  }
});

export async function requireSession(roles?: Role[]): Promise<PublicUser> {
  const user = await getSession();
  if (!user) {
    const requestHeaders = await headers();
    const pathname = requestHeaders.get("x-pathname");
    const suffix = pathname
      ? `?returnTo=${encodeURIComponent(pathname)}&reason=session-expired`
      : "";
    redirect(`/login${suffix}`);
  }
  if (roles && roles.length > 0 && !roles.includes(user.role as Role)) {
    redirect("/not-allowed");
  }
  return user;
}
