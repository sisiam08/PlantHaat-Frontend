import "server-only";

import axios, { type AxiosRequestConfig } from "axios";

import { serverEnv } from "@/env/server";
import {
  ApiError,
  isErrorEnvelope,
  unwrap,
  type ApiResult,
  type SuccessEnvelope,
} from "@/lib/api/common";

/**
 * Server-only Axios instance. Never carries a default Authorization header —
 * the server process serves many users, so tokens are attached per call from
 * the session to avoid cross-request leakage.
 */
export const serverApi = axios.create({
  baseURL: `${serverEnv.API_INTERNAL_URL}/api/v1`,
  timeout: serverEnv.BACKEND_TIMEOUT_MS,
  allowAbsoluteUrls: false,
  paramsSerializer: { indexes: null },
});

export interface ServerRequestOptions {
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Native Axios/Node error codes mapped to the gateway error vocabulary. */
const NATIVE_ERROR_MAP: Record<string, { code: string; status: number }> = {
  ECONNABORTED: { code: "GATEWAY_TIMEOUT", status: 504 },
  ETIMEDOUT: { code: "GATEWAY_TIMEOUT", status: 504 },
  ECONNREFUSED: { code: "GATEWAY_UNREACHABLE", status: 502 },
  ENOTFOUND: { code: "GATEWAY_UNREACHABLE", status: 502 },
  ECONNRESET: { code: "GATEWAY_UNREACHABLE", status: 502 },
};

/** Mapped codes safe to retry once (transient connectivity failures). */
const RETRYABLE_CODES = new Set(["GATEWAY_TIMEOUT", "GATEWAY_UNREACHABLE"]);
const RETRY_DELAY_MS = 200;
const isProduction = process.env.NODE_ENV === "production";

function isIdempotent(config: AxiosRequestConfig): boolean {
  const method = (config.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
}

function causeCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  if (cause instanceof Error) {
    return cause.name;
  }
  return undefined;
}

function toServerError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body: unknown = error.response?.data;
    if (isErrorEnvelope(body)) {
      return new ApiError(
        body.error.code,
        status || body.statusCode,
        body.error.details,
        body.error.message,
      );
    }
    const mapped = error.code ? NATIVE_ERROR_MAP[error.code] : undefined;
    if (mapped) {
      return new ApiError(mapped.code, mapped.status);
    }
    if (!error.response) {
      return new ApiError("GATEWAY_UNREACHABLE", 502);
    }
    return new ApiError(`HTTP_${status}`, status);
  }
  return new ApiError("UNKNOWN", 0, undefined, error instanceof Error ? error.message : undefined);
}

async function requestOnce<T>(
  config: AxiosRequestConfig,
  options: ServerRequestOptions,
): Promise<ApiResult<T>> {
  const startedAt = performance.now();
  try {
    const response = await serverApi.request<SuccessEnvelope<T>>({
      ...config,
      headers: {
        ...config.headers,
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      signal: options.signal,
    });
    return unwrap(response.data);
  } catch (error) {
    const mapped = toServerError(error);
    if (!isProduction && RETRYABLE_CODES.has(mapped.code)) {
      console.warn(
        `[server-api] ${(config.method ?? "GET").toUpperCase()} ${config.url} failed in ${Math.round(
          performance.now() - startedAt,
        )}ms code=${axios.isAxiosError(error) ? error.code ?? "none" : "n/a"} cause=${
          causeCode(error) ?? "none"
        } -> ${mapped.code}`,
      );
    }
    throw mapped;
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a request and, for idempotent calls only, retries exactly once after a
 * short backoff on a transient connectivity failure. Mutations are never
 * retried (a duplicate write is worse than a surfaced error).
 */
export async function serverRequest<T>(
  config: AxiosRequestConfig,
  options: ServerRequestOptions = {},
): Promise<ApiResult<T>> {
  try {
    return await requestOnce<T>(config, options);
  } catch (error) {
    if (
      isIdempotent(config) &&
      error instanceof ApiError &&
      RETRYABLE_CODES.has(error.code) &&
      !options.signal?.aborted
    ) {
      await delay(RETRY_DELAY_MS);
      return requestOnce<T>(config, options);
    }
    throw error;
  }
}

export const serverGet = <T>(url: string, options?: ServerRequestOptions) =>
  serverRequest<T>({ method: "GET", url }, options);

export const serverPost = <T>(url: string, data?: unknown, options?: ServerRequestOptions) =>
  serverRequest<T>({ method: "POST", url, data }, options);

export const serverPatch = <T>(url: string, data?: unknown, options?: ServerRequestOptions) =>
  serverRequest<T>({ method: "PATCH", url, data }, options);

export const serverPut = <T>(url: string, data?: unknown, options?: ServerRequestOptions) =>
  serverRequest<T>({ method: "PUT", url, data }, options);

export const serverDelete = <T>(url: string, options?: ServerRequestOptions) =>
  serverRequest<T>({ method: "DELETE", url }, options);
