import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "@/server/refresh";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("server refreshSession", () => {
  it("single-flights refresh per refresh-token value", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "ph_at=NEW_AT; Path=/; HttpOnly");
      headers.append("set-cookie", "ph_rt=NEW_RT; Path=/api/v1/auth; HttpOnly");
      return new Response(
        JSON.stringify({ success: true, data: { accessTokenExpiresAt: 123 } }),
        { status: 200, headers },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      refreshSession("old-refresh"),
      refreshSession("old-refresh"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe("NEW_AT");
    expect(second.refreshToken).toBe("NEW_RT");
    expect(first.accessTokenExpiresAt).toBe(123);
  });

  it("throws when the backend refresh fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("nope", { status: 401 })),
    );

    await expect(refreshSession("bad")).rejects.toThrow(/401/);
  });
});
