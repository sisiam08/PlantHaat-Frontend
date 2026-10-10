export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path?: string;
  timestamp?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Codes emitted by the BFF gateway itself (not the backend). */
export const GATEWAY_ERROR_CODES = [
  "GATEWAY_UNREACHABLE",
  "GATEWAY_TIMEOUT",
  "ORIGIN_NOT_ALLOWED",
  "PAYLOAD_TOO_LARGE",
] as const;

export const NETWORK_ERROR_CODES = ["NETWORK_ERROR", "TIMEOUT", "CANCELED"] as const;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, details?: unknown, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: unknown }).success === false &&
    "error" in value
  );
}

export function unwrap<T>(envelope: SuccessEnvelope<T>): { data: T; meta?: PaginationMeta } {
  return envelope.meta ? { data: envelope.data, meta: envelope.meta } : { data: envelope.data };
}
