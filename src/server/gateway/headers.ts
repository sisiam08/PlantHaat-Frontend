import "server-only";

import type { NextRequest } from "next/server";

import { serverEnv } from "@/env/server";

const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "accept-language",
  "idempotency-key",
  "user-agent",
  "x-request-id",
  "x-settings-reauth",
] as const;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "set-cookie",
]);

export interface UpstreamHeaderOptions {
  accessToken?: string;
  refreshToken?: string;
  isAuthPath: boolean;
}

export function buildUpstreamHeaders(
  request: NextRequest,
  options: UpstreamHeaderOptions,
): Headers {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", crypto.randomUUID());
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  // Forward the real client IP (the hosting platform sets a trusted value).
  const clientIp =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  }

  if (serverEnv.BFF_SHARED_SECRET) {
    headers.set("X-BFF-Key", serverEnv.BFF_SHARED_SECRET);
  }

  if (options.isAuthPath) {
    headers.set("Cookie", `ph_rt=${options.refreshToken ?? ""}`);
  }

  return headers;
}

export function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.append(key, value);
    }
  });
  return headers;
}
