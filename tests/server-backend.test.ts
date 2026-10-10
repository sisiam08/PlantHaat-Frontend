import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/common";
import { serverGet } from "@/server/backend";

const msw = setupServer();

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("serverApi (serverRequest)", () => {
  it("unwraps the success envelope", async () => {
    msw.use(
      http.get("http://localhost:5000/api/v1/health", () =>
        HttpResponse.json({ success: true, data: { status: "ok", database: "up" } }),
      ),
    );
    const result = await serverGet<{ status: string }>("/health");
    expect(result.data.status).toBe("ok");
  });

  it("attaches a per-call bearer token", async () => {
    let authorization: string | null = null;
    msw.use(
      http.get("http://localhost:5000/api/v1/auth/me", ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({ success: true, data: { id: "u1" } });
      }),
    );
    await serverGet("/auth/me", { token: "abc" });
    expect(authorization).toBe("Bearer abc");
  });

  it("throws a normalized ApiError for backend errors", async () => {
    msw.use(
      http.get("http://localhost:5000/api/v1/orders", () =>
        HttpResponse.json(
          { success: false, statusCode: 401, error: { code: "TOKEN_EXPIRED", message: "expired" } },
          { status: 401 },
        ),
      ),
    );
    await expect(serverGet("/orders")).rejects.toMatchObject({ code: "TOKEN_EXPIRED", status: 401 });
    await expect(serverGet("/orders")).rejects.toBeInstanceOf(ApiError);
  });
});
