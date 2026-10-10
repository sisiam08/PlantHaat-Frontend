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

function toServerError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body: unknown = error.response?.data;
    if (isErrorEnvelope(body)) {
      return new ApiError(body.error.code, status || body.statusCode, body.error.details, body.error.message);
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError("TIMEOUT", status);
    }
    if (!error.response) {
      return new ApiError("GATEWAY_UNREACHABLE", 0);
    }
    return new ApiError(`HTTP_${status}`, status);
  }
  return new ApiError("UNKNOWN", 0, undefined, error instanceof Error ? error.message : undefined);
}

export async function serverRequest<T>(
  config: AxiosRequestConfig,
  options: ServerRequestOptions = {},
): Promise<ApiResult<T>> {
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
    throw toServerError(error);
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
