import { describe, expect, it } from "vitest";

import {
  isStrongPassword,
  missingPasswordRequirements,
  passwordChecks,
} from "@/lib/auth/password-policy";

describe("password policy", () => {
  it("accepts a password with all five requirements", () => {
    expect(isStrongPassword("Str0ngPass!")).toBe(true);
    expect(missingPasswordRequirements("Str0ngPass!")).toEqual([]);
  });

  it("reports only the missing requirements", () => {
    expect(missingPasswordRequirements("planthaat")).toEqual([
      "uppercase",
      "number",
      "special",
    ]);
    expect(passwordChecks("plantHaat")).toEqual({
      length: true,
      uppercase: true,
      lowercase: true,
      number: false,
      special: false,
    });
  });

  it("does not accept an 8-digit-only password", () => {
    expect(isStrongPassword("12345678")).toBe(false);
  });
});
