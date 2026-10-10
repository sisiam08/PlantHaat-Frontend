import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { PublicUser, Role } from "@/lib/api/types";
import { serverGet } from "./backend";
import { ACCESS_COOKIE } from "./cookie-names";
import { accessTokenExpiresAt, decodeAccessToken } from "./jwt";

export { accessTokenExpiresAt, decodeAccessToken };

export const getSession = cache(async (): Promise<PublicUser | null> => {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const { data } = await serverGet<PublicUser>("/auth/me", { token });
    return data;
  } catch {
    return null;
  }
});

export async function requireSession(roles?: Role[]): Promise<PublicUser> {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (roles && roles.length > 0 && !roles.includes(user.role as Role)) {
    redirect("/not-allowed");
  }
  return user;
}
