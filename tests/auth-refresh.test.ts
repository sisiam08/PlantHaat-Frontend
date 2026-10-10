import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { apiGet, apiPost } from "@/lib/api/client";
import { sanitizeReturnTo } from "@/lib/navigation";

const msw = setupServer();

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("browser client refresh", () => {
  it("refreshes once and retries the original request on TOKEN_EXPIRED", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    msw.use(
      http.get("/api/v1/protected", () => {
        protectedCalls += 1;
        if (protectedCalls === 1) {
          return HttpResponse.json(
            { success: false, statusCode: 401, error: { code: "TOKEN_EXPIRED", message: "expired" } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
      http.post("/api/v1/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ success: true, data: { accessTokenExpiresAt: 1 } });
      }),
    );

    const result = await apiGet<{ ok: boolean }>("/protected");
    expect(result.data.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });

  it("single-flights refresh for concurrent 401s", async () => {
    let refreshCalls = 0;
    msw.use(
      http.get("/api/v1/a", () =>
        HttpResponse.json(
          { success: false, statusCode: 401, error: { code: "TOKEN_EXPIRED", message: "x" } },
          { status: 401 },
        ),
      ),
      http.get("/api/v1/b", () =>
        HttpResponse.json(
          { success: false, statusCode: 401, error: { code: "TOKEN_EXPIRED", message: "x" } },
          { status: 401 },
        ),
      ),
      http.post("/api/v1/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    const [a, b] = await Promise.allSettled([apiGet("/a"), apiGet("/b")]);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("rejected");
    expect(refreshCalls).toBe(1);
  });

  it("never refreshes on a /auth/* 401 (no loops)", async () => {
    let refreshCalls = 0;
    msw.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json(
          { success: false, statusCode: 401, error: { code: "INVALID_CREDENTIALS", message: "no" } },
          { status: 401 },
        ),
      ),
      http.post("/api/v1/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await expect(apiPost("/auth/login", {})).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(refreshCalls).toBe(0);
  });
});

describe("sanitizeReturnTo", () => {
  it("allows only relative same-origin paths", () => {
    expect(sanitizeReturnTo("/orders/123?x=1")).toBe("/orders/123?x=1");
    expect(sanitizeReturnTo("https://evil.example")).toBeUndefined();
    expect(sanitizeReturnTo("//evil.example")).toBeUndefined();
    expect(sanitizeReturnTo("orders")).toBeUndefined();
    expect(sanitizeReturnTo(null)).toBeUndefined();
  });
});
