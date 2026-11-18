import "server-only";

import { redirect } from "next/navigation";

import { sanitizeReturnTo } from "@/lib/navigation";
import type { Role } from "@/lib/api/types";
import { accessTokenExpiresAt, decodeAccessToken } from "./jwt";
import { readAuthCookies } from "./cookies";

export function roleHomePath(role: Role | string | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "SELLER") return "/seller/dashboard";
  return "/";
}

function safeAuthDestination(next?: string | null): string | undefined {
  const destination = sanitizeReturnTo(next);
  if (!destination) {
    return undefined;
  }
  if (
    destination === "/login" ||
    destination.startsWith("/login?") ||
    destination === "/register" ||
    destination.startsWith("/register?") ||
    destination.startsWith("/auth/")
  ) {
    return undefined;
  }
  return destination;
}

/**
 * Auth entry pages are server-rendered only for guests. A valid access token
 * redirects immediately (role routing only; downstream pages still verify the
 * session). A refreshable session goes through /auth/continue so rotated
 * cookies can be written before redirecting.
 */
export async function redirectIfAuthenticated(next?: string | null): Promise<void> {
  const destination = safeAuthDestination(next);
  const { accessToken, refreshToken } = await readAuthCookies();
  const expiresAt = accessTokenExpiresAt(accessToken);
  const accessUsable =
    Boolean(accessToken) &&
    expiresAt !== undefined &&
    expiresAt - Date.now() > 5_000;


  if (accessUsable && accessToken) {
    redirect(destination ?? roleHomePath(decodeAccessToken(accessToken)?.role));
  }
  if (refreshToken) {
    const query = destination ? `?next=${encodeURIComponent(destination)}` : "";
    redirect(`/auth/continue${query}`);
  }
}
