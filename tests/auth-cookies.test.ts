import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
  LEGACY_REFRESH_COOKIE,
  LEGACY_REFRESH_PATH,
  REFRESH_COOKIE,
} from "@/server/cookie-names";
import { applyBackendSetCookies, clearAuthCookies } from "@/server/cookies";

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

describe("auth cookie names", () => {
  it("does not reuse the API cookie names in the browser app", () => {
    expect(ACCESS_COOKIE).not.toBe(LEGACY_ACCESS_COOKIE);
    expect(REFRESH_COOKIE).not.toBe(LEGACY_REFRESH_COOKIE);
  });

  it("re-issues backend cookies under the web names and clears legacy duplicates", () => {
    const upstream = new Response(null, {
      headers: [
        ["set-cookie", "ph_at=NEW_ACCESS; Path=/; HttpOnly; Max-Age=900"],
        ["set-cookie", "ph_rt=NEW_REFRESH; Path=/api/v1/auth; HttpOnly; Max-Age=100"],
      ],
    });
    const response = NextResponse.next();
    applyBackendSetCookies(upstream, response);
    const headers = setCookies(response);

    expect(headers.some((value) => value.startsWith(`${ACCESS_COOKIE}=NEW_ACCESS`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${REFRESH_COOKIE}=NEW_REFRESH`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${LEGACY_ACCESS_COOKIE}=;`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${LEGACY_REFRESH_COOKIE}=;`))).toBe(true);
    expect(headers.some((value) => value.includes(`Path=${LEGACY_REFRESH_PATH}`))).toBe(true);
  });

  it("turns a backend expired Set-Cookie into a real delete, not an empty session cookie", () => {
    const upstream = new Response(null, {
      headers: [
        ["set-cookie", "ph_at=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly"],
        ["set-cookie", "ph_rt=; Path=/api/v1/auth; Max-Age=0; HttpOnly"],
      ],
    });
    const response = NextResponse.next();
    applyBackendSetCookies(upstream, response);
    const headers = setCookies(response);
    expect(
      headers.filter((value) => value.startsWith(`${ACCESS_COOKIE}=`)).every((value) => /Max-Age=0/i.test(value)),
    ).toBe(true);
    expect(
      headers.filter((value) => value.startsWith(`${REFRESH_COOKIE}=`)).every((value) => /Max-Age=0/i.test(value)),
    ).toBe(true);
  });

  it("clears the web cookies and both legacy paths on logout", () => {
    const response = NextResponse.next();
    clearAuthCookies(response);
    const headers = setCookies(response);

    expect(headers.some((value) => value.startsWith(`${ACCESS_COOKIE}=;`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${REFRESH_COOKIE}=;`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${LEGACY_ACCESS_COOKIE}=;`))).toBe(true);
    expect(headers.some((value) => value.startsWith(`${LEGACY_REFRESH_COOKIE}=;`))).toBe(true);
  });
});
