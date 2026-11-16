import "server-only";

import { redirect } from "next/navigation";

import { sanitizeReturnTo } from "@/lib/navigation";
import type { Role } from "@/lib/api/types";
import { readAuthCookies } from "./cookies";
import { getSession } from "./session";

export function roleHomePath(role: Role | string | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "SELLER") return "/seller/dashboard";
  return "/";
}

/**
 * Auth entry pages are server-rendered only for guests. A valid access token
 * redirects immediately; a refreshable session goes through /auth/continue so
 * rotated cookies can be written before redirecting.
 */
export async function redirectIfAuthenticated(next?: string | null): Promise<void> {
  const destination = sanitizeReturnTo(next);
  const user = await getSession();
  if (user) {
    redirect(destination ?? roleHomePath(user.role));
  }
  const { refreshToken } = await readAuthCookies();
  if (refreshToken) {
    const query = destination ? `?next=${encodeURIComponent(destination)}` : "";
    redirect(`/auth/continue${query}`);
  }
}
