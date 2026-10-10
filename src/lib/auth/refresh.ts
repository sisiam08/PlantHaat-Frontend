import axios from "axios";

/**
 * Single-flight browser refresh: concurrent 401s trigger exactly one
 * POST /api/v1/auth/refresh. Uses a bare Axios call so the API client's
 * interceptors can never recurse.
 */
let inflight: Promise<boolean> | null = null;

export function refreshOnce(): Promise<boolean> {
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
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}
