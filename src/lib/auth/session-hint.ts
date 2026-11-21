const COOKIE = "ph_has_session";

/**
 * Non-sensitive layout hint only: lets client chrome reserve signed-in space
 * before /auth/me resolves. Authorization always comes from the API, never
 * from this cookie.
 */
export function readSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part === `${COOKIE}=1`);
}

export function writeSessionHint(active: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${active ? "1" : ""}; path=/; max-age=${active ? 31536000 : 0}; samesite=lax`;
}
