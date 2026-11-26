/**
 * Browser (Next-origin) auth cookies. They are deliberately named differently
 * from the API's own `ph_at`/`ph_rt`: cookies ignore ports, so on localhost the
 * Next app (3000) and the API (5000) share a jar. Same-name cookies with
 * different Paths ("/" vs "/api/v1/auth") are both sent on /api/v1/auth/* and
 * the server could read the stale one (Express cookie-parser takes the first).
 */
export const ACCESS_COOKIE = "ph_web_at";
export const REFRESH_COOKIE = "ph_web_rt";

/** Non-sensitive UX marker: this browser had a session that expired. */
export const SESSION_EXPIRED_COOKIE = "ph_session_expired";

/** Pre-rename names, read as a fallback and cleared on every write. */
export const LEGACY_ACCESS_COOKIE = "ph_at";
export const LEGACY_REFRESH_COOKIE = "ph_rt";

/** The API origin's refresh-cookie path (where a legacy duplicate can live). */
export const LEGACY_REFRESH_PATH = "/api/v1/auth";

export const AUTH_COOKIE_NAMES = [
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_ACCESS_COOKIE,
  LEGACY_REFRESH_COOKIE,
] as const;
