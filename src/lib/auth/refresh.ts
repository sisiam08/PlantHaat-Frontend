import axios from "axios";

/**
 * Single-flight browser refresh: concurrent 401s trigger exactly one
 * POST /api/v1/auth/refresh. Uses a bare Axios call so the API client's
 * interceptors can never recurse.
 *
 * After a refresh fails (no/grace-expired refresh token → the visitor has no
 * live session), later 401s skip the refresh POST instead of hammering
 * /auth/refresh from every public page; the flag clears as soon as any
 * /auth/* request succeeds (login/refresh created a real session).
 */
let inflight: Promise<boolean> | null = null;
let assumeNoSession = false;

/** Any successful /auth/* response (login, refresh) restarts the retry flow. */
function isAuthUrl(url?: string): boolean {
  return typeof url === "string" && url.startsWith("/auth/");
}

export function markAuthSuccess(url?: string): void {
  if (isAuthUrl(url)) {
    assumeNoSession = false;
  }
}

export function refreshOnce(): Promise<boolean> {
  if (assumeNoSession) {
    return Promise.resolve(false);
  }
  if (!inflight) {
    inflight = run().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function run(): Promise<boolean> {
  try {
    const response = await axios.post("/api/v1/auth/refresh", null, { timeout: 15000 });
    assumeNoSession = false;
    return response.status >= 200 && response.status < 300;
  } catch {
    assumeNoSession = true;
    return false;
  }
}
