import "server-only";

import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv, siteOrigins } from "@/env/server";
import { tagsForMutation } from "../cache-tags";
import { accessTokenExpiresAt } from "../jwt";
import { refreshSession, type RefreshedTokens } from "../refresh";
import { applyBackendSetCookies, authCookieOptions } from "../cookies";
import { normalizeApiPath } from "./allow-list";
import { buildUpstreamHeaders, copyResponseHeaders } from "./headers";
import { gatewayError } from "./errors";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REFRESH_SKEW_MS = 30_000;
const SLOW_REQUEST_MS = 500;

function refererOrigin(referer: string | null): string | null {
  if (!referer) {
    return null;
  }
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function readCookie(request: NextRequest, name: string): string | undefined {
  return request.cookies.get(name)?.value;
}

async function fetchUpstream(
  url: URL,
  method: string,
  headers: Headers,
  body: string | ReadableStream<Uint8Array> | undefined,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverEnv.BACKEND_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      ...(body && typeof body !== "string" ? { duplex: "half" } : {}),
    } as RequestInit);
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleGatewayRequest(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  const startedAt = performance.now();
  let upstreamMs = 0;
  const method = request.method.toUpperCase();
  const path = normalizeApiPath(segments);
  if (!path) {
    return gatewayError("NOT_FOUND", "Not found", 404, request.nextUrl.pathname);
  }

  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin") ?? refererOrigin(request.headers.get("referer"));
    if (!origin || !siteOrigins.includes(origin)) {
      return gatewayError("ORIGIN_NOT_ALLOWED", "Origin not allowed", 403, path);
    }
  }

  const isAuthPath = path.startsWith("/auth/refresh") || path.startsWith("/auth/logout");
  let accessToken = readCookie(request, "ph_at");
  const refreshToken = readCookie(request, "ph_rt");

  // Session probe: with no auth cookies the caller is definitively signed out,
  // so answer locally instead of proxying a 401 (avoids a noisy failed request
  // in the browser console on every anonymous page load).
  if (method === "GET" && path === "/auth/me" && !accessToken && !refreshToken) {
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  }

  const url = new URL(`${serverEnv.API_INTERNAL_URL}/api/v1${path}`);
  url.search = request.nextUrl.search;

  let body: string | ReadableStream<Uint8Array> | undefined;
  let streamed = false;
  let buffered: string | undefined;
  if (BODY_METHODS.has(method) && request.body) {
    const maxBytes = serverEnv.GATEWAY_MAX_BODY_MB * 1024 * 1024;
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > maxBytes) {
      return gatewayError("PAYLOAD_TOO_LARGE", "Payload too large", 413, path);
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = request.body;
      streamed = true;
    } else {
      buffered = await request.text();
      if (Buffer.byteLength(buffered, "utf8") > maxBytes) {
        return gatewayError("PAYLOAD_TOO_LARGE", "Payload too large", 413, path);
      }
      body = buffered;
    }
  }

  let refreshed: RefreshedTokens | null = null;
  // Streamed uploads cannot be replayed, so refresh before forwarding when the
  // access token is missing or about to expire.
  if (streamed && refreshToken && !isAuthPath) {
    const exp = accessTokenExpiresAt(accessToken);
    if (!exp || exp - Date.now() <= REFRESH_SKEW_MS) {
      try {
        const tokens = await refreshSession(refreshToken);
        accessToken = tokens.accessToken;
        refreshed = tokens;
      } catch {
        // Fall through; the upstream 401 is handled below.
      }
    }
  }

  const doForward = async (token: string | undefined): Promise<Response> => {
    const headers = buildUpstreamHeaders(request, { accessToken: token, refreshToken, isAuthPath });
    const fetchStartedAt = performance.now();
    try {
      return await fetchUpstream(url, method, headers, body);
    } finally {
      upstreamMs += performance.now() - fetchStartedAt;
    }
  };

  let upstream: Response;
  try {
    upstream = await doForward(accessToken);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return gatewayError("GATEWAY_TIMEOUT", "Upstream timed out", 504, path);
    }
    return gatewayError("GATEWAY_UNREACHABLE", "Upstream unreachable", 502, path);
  }

  // Server-side silent refresh + replay for buffered (replayable) requests.
  if (upstream.status === 401 && !isAuthPath && refreshToken && !streamed) {
    try {
      const tokens = await refreshSession(refreshToken);
      accessToken = tokens.accessToken;
      refreshed = tokens;
      upstream = await doForward(accessToken);
    } catch {
      // Return the original 401 below.
    }
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream),
  });

  if (upstream.headers.getSetCookie().length > 0) {
    applyBackendSetCookies(upstream, response);
  }

  if (refreshed && accessToken) {
    response.cookies.set("ph_at", accessToken, {
      ...authCookieOptions(),
      maxAge: refreshed.accessMaxAgeSeconds ?? 15 * 60,
    });
    if (refreshed.refreshToken && refreshed.refreshMaxAgeSeconds !== undefined) {
      response.cookies.set("ph_rt", refreshed.refreshToken, {
        ...authCookieOptions(),
        maxAge: refreshed.refreshMaxAgeSeconds,
      });
    }
    response.headers.set("x-auth-refresh", "1");
    if (refreshed.generation !== undefined) {
      response.headers.set("x-auth-refresh-generation", String(refreshed.generation));
    }
  }

  // Auth/mutation responses must never be cached by shared caches.
  if (isAuthPath || method !== "GET") {
    response.headers.set("Cache-Control", "private, no-store");
  }

  // Invalidate cached catalog data after a successful mutation.
  if (method !== "GET" && upstream.status < 400) {
    for (const tag of tagsForMutation(path, method)) {
      revalidateTag(tag, "max");
    }
  }

  // Expose gateway/upstream timing to the browser (and dev tooling) and surface
  // slow gateway round-trips in the server log for bottleneck attribution.
  const totalMs = performance.now() - startedAt;
  response.headers.set(
    "Server-Timing",
    `gateway;dur=${totalMs.toFixed(1)}, upstream;dur=${upstreamMs.toFixed(1)}`,
  );
  if (totalMs >= SLOW_REQUEST_MS || upstreamMs >= SLOW_REQUEST_MS) {
    console.warn(
      `[gateway] slow ${method} ${path} total=${totalMs.toFixed(0)}ms upstream=${upstreamMs.toFixed(0)}ms`,
    );
  }

  return response;
}
