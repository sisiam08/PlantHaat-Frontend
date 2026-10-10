import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { ApiError, isErrorEnvelope, unwrap } from "@/lib/api/common";
import { toApiError } from "@/lib/api/client";

describe("api/common", () => {
  it("unwraps success envelopes with and without meta", () => {
    expect(unwrap({ success: true, data: { id: "1" } })).toEqual({ data: { id: "1" } });
    expect(
      unwrap({
        success: true,
        data: [1, 2],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      }),
    ).toMatchObject({ data: [1, 2], meta: { total: 2 } });
  });

  it("recognizes error envelopes", () => {
    expect(
      isErrorEnvelope({ success: false, statusCode: 422, error: { code: "X", message: "y" } }),
    ).toBe(true);
    expect(isErrorEnvelope({ success: true, data: {} })).toBe(false);
  });
});

describe("toApiError", () => {
  it("maps a backend error envelope to ApiError with the code", () => {
    const error = new AxiosError("bad", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {
        success: false,
        statusCode: 422,
        error: { code: "INSUFFICIENT_STOCK", message: "no", details: [{ a: 1 }] },
      },
    });
    const mapped = toApiError(error);
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.code).toBe("INSUFFICIENT_STOCK");
    expect(mapped.status).toBe(422);
    expect(mapped.details).toEqual([{ a: 1 }]);
  });

  it("maps network failures", () => {
    const error = new AxiosError("network", "ERR_NETWORK");
    expect(toApiError(error).code).toBe("NETWORK_ERROR");
  });

  it("maps timeouts", () => {
    const error = new AxiosError("timeout", "ECONNABORTED");
    expect(toApiError(error).code).toBe("TIMEOUT");
  });
});
