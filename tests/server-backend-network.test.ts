import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/common";
import { serverRequest } from "@/server/backend";

/**
 * Real-socket test: port 1 on loopback is closed, so Axios gets a genuine
 * ECONNREFUSED (no MSW interception here) — exactly the failure mode observed
 * when the backend is down.
 */
describe("serverApi against a dead port", () => {
  it("maps a refused loopback connection to GATEWAY_UNREACHABLE (502)", async () => {
    await expect(
      serverRequest({
        method: "GET",
        url: "/health",
        baseURL: "http://127.0.0.1:1",
        timeout: 2000,
      }),
    ).rejects.toMatchObject({ code: "GATEWAY_UNREACHABLE", status: 502 });
  }, 10000);

  it("throws a typed ApiError, never a raw Axios error", async () => {
    const error = await serverRequest({
      method: "GET",
      url: "/health",
      baseURL: "http://127.0.0.1:1",
      timeout: 2000,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
  }, 10000);
});
