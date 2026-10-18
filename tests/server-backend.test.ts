import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/common";
import { serverGet, serverRequest } from "@/server/backend";

const msw = setupServer();

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

function failingAdapter(code: string): (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> {
  return (config) => Promise.reject(new AxiosError("boom", code, config));
}

function successAdapter(
  calls: { count: number },
  failCode: string,
  failTimes = 1,
): (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> {
  return (config) => {
    calls.count += 1;
    if (calls.count <= failTimes) {
      return Promise.reject(new AxiosError("boom", failCode, config));
    }
    return Promise.resolve({
      data: { success: true, data: { ok: true } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as AxiosResponse);
  };
}

describe("serverApi (serverRequest)", () => {
  it("unwraps the success envelope", async () => {
    msw.use(
      http.get("http://127.0.0.1:5000/api/v1/health", () =>
        HttpResponse.json({ success: true, data: { status: "ok", database: "up" } }),
      ),
    );
    const result = await serverGet<{ status: string }>("/health");
    expect(result.data.status).toBe("ok");
  });

  it("attaches a per-call bearer token", async () => {
    let authorization: string | null = null;
    msw.use(
      http.get("http://127.0.0.1:5000/api/v1/auth/me", ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({ success: true, data: { id: "u1" } });
      }),
    );
    await serverGet("/auth/me", { token: "abc" });
    expect(authorization).toBe("Bearer abc");
  });

  it("throws a normalized ApiError for backend errors", async () => {
    msw.use(
      http.get("http://127.0.0.1:5000/api/v1/orders", () =>
        HttpResponse.json(
          { success: false, statusCode: 401, error: { code: "TOKEN_EXPIRED", message: "expired" } },
          { status: 401 },
        ),
      ),
    );
    await expect(serverGet("/orders")).rejects.toMatchObject({ code: "TOKEN_EXPIRED", status: 401 });
    await expect(serverGet("/orders")).rejects.toBeInstanceOf(ApiError);
  });

  describe("error mapping", () => {
    it("maps a socket reset to GATEWAY_UNREACHABLE (502)", async () => {
      await expect(
        serverRequest({ method: "GET", url: "/x", adapter: failingAdapter("ECONNRESET") }),
      ).rejects.toMatchObject({ code: "GATEWAY_UNREACHABLE", status: 502 });
    });

    it("maps connection refused to GATEWAY_UNREACHABLE (502)", async () => {
      await expect(
        serverRequest({ method: "GET", url: "/x", adapter: failingAdapter("ECONNREFUSED") }),
      ).rejects.toMatchObject({ code: "GATEWAY_UNREACHABLE", status: 502 });
    });

    it("maps a timeout to GATEWAY_TIMEOUT (504), not unreachable", async () => {
      await expect(
        serverRequest({ method: "GET", url: "/x", adapter: failingAdapter("ETIMEDOUT") }),
      ).rejects.toMatchObject({ code: "GATEWAY_TIMEOUT", status: 504 });
      await expect(
        serverRequest({ method: "GET", url: "/x", adapter: failingAdapter("ECONNABORTED") }),
      ).rejects.toMatchObject({ code: "GATEWAY_TIMEOUT", status: 504 });
    });
  });

  describe("retry", () => {
    it("retries an idempotent GET once after a transient failure", async () => {
      const calls = { count: 0 };
      const result = await serverRequest<{ ok: boolean }>({
        method: "GET",
        url: "/x",
        adapter: successAdapter(calls, "ECONNRESET"),
      });
      expect(result.data.ok).toBe(true);
      expect(calls.count).toBe(2);
    });

    it("never retries a mutation", async () => {
      const calls = { count: 0 };
      await expect(
        serverRequest({
          method: "POST",
          url: "/x",
          data: {},
          adapter: successAdapter(calls, "ECONNRESET", 99),
        }),
      ).rejects.toMatchObject({ code: "GATEWAY_UNREACHABLE", status: 502 });
      expect(calls.count).toBe(1);
    });

    it("does not retry a non-transient HTTP error", async () => {
      const calls = { count: 0 };
      const adapter = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
        calls.count += 1;
        const response = {
          data: {
            success: false,
            statusCode: 500,
            error: { code: "INTERNAL_ERROR", message: "x" },
          },
          status: 500,
          statusText: "Server Error",
          headers: {},
          config,
        } as AxiosResponse;
        return Promise.reject(new AxiosError("request failed", "ERR_BAD_RESPONSE", config, undefined, response));
      };
      await expect(serverRequest({ method: "GET", url: "/x", adapter })).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        status: 500,
      });
      expect(calls.count).toBe(1);
    });
  });
});
