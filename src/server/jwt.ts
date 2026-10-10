import type { Role } from "@/lib/api/types";

export interface AccessTokenClaims {
  sub?: string;
  role?: Role;
  exp?: number;
  sid?: string;
}

/** Decodes the JWT payload WITHOUT verifying the signature (scheduling/UX only). */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function accessTokenExpiresAt(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }
  const claims = decodeAccessToken(token);
  return typeof claims?.exp === "number" ? claims.exp * 1000 : undefined;
}
