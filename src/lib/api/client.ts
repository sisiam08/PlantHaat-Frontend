import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

import { refreshOnce, markAuthSuccess } from "@/lib/auth/refresh";
import {
  ApiError,
  isErrorEnvelope,
  unwrap,
  type ApiResult,
  type SuccessEnvelope,
} from "./common";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Internal flag used by the refresh interceptor to retry a request once. */
    _retried?: boolean;
  }
}

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  allowAbsoluteUrls: false,
  paramsSerializer: { indexes: null },
});

const AUTH_URL_PREFIX = "/auth/";

function isAuthUrl(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith(AUTH_URL_PREFIX);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status ?? 0;
    const body = axiosError.response?.data;
    if (isErrorEnvelope(body)) {
      return new ApiError(body.error.code, status || body.statusCode, body.error.details, body.error.message);
    }
    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      return new ApiError("TIMEOUT", status);
    }
    if (!axiosError.response) {
      return new ApiError("NETWORK_ERROR", 0);
    }
    return new ApiError(`HTTP_${status}`, status);
  }
  return new ApiError("UNKNOWN", 0, undefined, error instanceof Error ? error.message : undefined);
}

api.interceptors.response.use(
  (response) => {
    // A successful login/refresh means a real session now exists; restart
    // the 401 → refresh flow (see lib/auth/refresh).
    markAuthSuccess(response?.config?.url);
    return response;
  },
  async (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const apiError = toApiError(error);
    const axiosError = error as AxiosError;
    const config = axiosError.config as AxiosRequestConfig | undefined;

    const shouldRefresh =
      apiError.status === 401 &&
      (apiError.code === "TOKEN_EXPIRED" || apiError.code === "UNAUTHENTICATED") &&
      config !== undefined &&
      !config._retried &&
      !isAuthUrl(config.url);

    if (shouldRefresh && config) {
      config._retried = true;
      const refreshed = await refreshOnce();
      if (refreshed) {
        return api.request(config);
      }
    }

    return Promise.reject(apiError);
  },
);

export async function request<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  const response = await api.request<SuccessEnvelope<T>>(config);
  return unwrap(response.data);
}

export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: "GET", url });

export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: "POST", url, data });

export const apiPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: "PUT", url, data });

export const apiPatch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: "PATCH", url, data });

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: "DELETE", url });
