import "server-only";

import { serverEnv } from "@/env/server";

export type RefreshFailureKind = "auth" | "transient";

export class RefreshError extends Error {
  constructor(
    readonly kind: RefreshFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "RefreshError";
  }
}

export interface RefreshedTokens {
  accessToken: string;
  /** Only present when the backend rotated the refresh token. A grace-window
   * reply deliberately returns access only; callers must keep the current
   * refresh cookie in that case. */
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  accessMaxAgeSeconds?: number;
  refreshMaxAgeSeconds?: number;
  /** Shared by every request that awaited the same in-flight refresh. */
  generation?: number;
}

/**
 * Single-flight refresh keyed by the refresh-token value: concurrent 401s that
 * share the same ph_rt trigger exactly one backend refresh call per process.
 */
const inflight = new Map<string, Promise<RefreshedTokens>>();
let refreshGeneration = 0;

export function refreshSession(refreshToken: string): Promise<RefreshedTokens> {
  const existing = inflight.get(refreshToken);
  if (existing) {
    return existing;
  }
  const promise = doRefreshWithRetry(refreshToken).finally(() => {
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

function readMaxAge(setCookieHeaders: string[], name: string): number | undefined {
  for (const header of setCookieHeaders) {
    if (!header.startsWith(`${name}=`)) {
      continue;
    }
    const match = /(?:^|;\s*)Max-Age=(\d+)/i.exec(header);
    if (match) {
      return Number(match[1]);
    }
    const expires = /(?:^|;\s*)Expires=([^;]+)/i.exec(header);
    if (expires) {
      const at = Date.parse(expires[1]);
      if (!Number.isNaN(at)) {
        return Math.max(0, Math.floor((at - Date.now()) / 1000));
      }
    }
  }
  return undefined;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function doRefreshWithRetry(refreshToken: string): Promise<RefreshedTokens> {
  try {
    return await doRefresh(refreshToken);
  } catch (error) {
    if (error instanceof RefreshError && error.kind === "transient") {
      await delay(250);
      return doRefresh(refreshToken);
    }
    throw error;
  }
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
  } catch {
    throw new RefreshError("transient", "Refresh request failed");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const kind: RefreshFailureKind =
      response.status === 401 || response.status === 403 ? "auth" : "transient";
    throw new RefreshError(kind, `Refresh failed with status ${response.status}`);
  }

  const setCookies = response.headers.getSetCookie();
  const accessToken = readCookieValue(setCookies, "ph_at");
  if (!accessToken) {
    throw new RefreshError("transient", "Refresh response did not set an access cookie");
  }

  let accessTokenExpiresAt: number | undefined;
  try {
    const body = (await response.json()) as { data?: { accessTokenExpiresAt?: number } };
    accessTokenExpiresAt = body.data?.accessTokenExpiresAt;
  } catch {
    accessTokenExpiresAt = undefined;
  }

  return {
    accessToken,
    refreshToken: readCookieValue(setCookies, "ph_rt"),
    accessTokenExpiresAt,
    accessMaxAgeSeconds: readMaxAge(setCookies, "ph_at"),
    refreshMaxAgeSeconds: readMaxAge(setCookies, "ph_rt"),
    generation: (refreshGeneration += 1),
  };
}
