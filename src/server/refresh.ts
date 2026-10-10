import "server-only";

import { serverEnv } from "@/env/server";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: number;
}

/**
 * Single-flight refresh keyed by the refresh-token value: concurrent 401s that
 * share the same ph_rt trigger exactly one backend refresh call per process.
 */
const inflight = new Map<string, Promise<RefreshedTokens>>();

export function refreshSession(refreshToken: string): Promise<RefreshedTokens> {
  const existing = inflight.get(refreshToken);
  if (existing) {
    return existing;
  }
  const promise = doRefresh(refreshToken).finally(() => {
    inflight.delete(refreshToken);
  });
  inflight.set(refreshToken, promise);
  return promise;
}

function readCookieValue(setCookieHeaders: string[], name: string): string | undefined {
  for (const header of setCookieHeaders) {
    const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(header);
    if (match && match[1] !== undefined) {
      return match[1];
    }
  }
  return undefined;
}

async function doRefresh(refreshToken: string): Promise<RefreshedTokens> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverEnv.BACKEND_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${serverEnv.API_INTERNAL_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `ph_rt=${refreshToken}`,
        Accept: "application/json",
        ...(serverEnv.BFF_SHARED_SECRET ? { "X-BFF-Key": serverEnv.BFF_SHARED_SECRET } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }

  const setCookies = response.headers.getSetCookie();
  const accessToken = readCookieValue(setCookies, "ph_at");
  const newRefreshToken = readCookieValue(setCookies, "ph_rt");
  if (!accessToken || !newRefreshToken) {
    throw new Error("Refresh response did not set auth cookies");
  }

  let accessTokenExpiresAt: number | undefined;
  try {
    const body = (await response.json()) as { data?: { accessTokenExpiresAt?: number } };
    accessTokenExpiresAt = body.data?.accessTokenExpiresAt;
  } catch {
    accessTokenExpiresAt = undefined;
  }

  return { accessToken, refreshToken: newRefreshToken, accessTokenExpiresAt };
}
