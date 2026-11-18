import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function messages(locale: "en" | "bn") {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `src/messages/${locale}.json`), "utf8"),
  ) as Record<string, unknown>;
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function get(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

describe("Part 4 settlement messages", () => {
  const en = messages("en");
  const bn = messages("bn");

  it("has the same part4 keys in both locales", () => {
    const enKeys = flattenKeys(get(en, "part4")).sort();
    const bnKeys = flattenKeys(get(bn, "part4")).sort();
    expect(bnKeys).toEqual(enKeys);
  });

  it("keeps Bengali label strings and Latin digits in money contexts", () => {
    const wallet = get(bn, "part4.wallet") as Record<string, string>;
    expect(wallet.title).toContain("ওয়ালেট");
    expect(wallet.limits).toContain("{min}");
    // Money values are interpolated from the API; no Bengali digits in labels.
    expect(JSON.stringify(wallet)).not.toMatch(/[০-৯]/);
  });

  it("has specific error messages for the new money-path codes", () => {
    const errors = get(en, "errors") as Record<string, string>;
    const bnErrors = get(bn, "errors") as Record<string, string>;
    for (const code of [
      "PAYOUT_PROFILE_REQUIRED",
      "PAYOUT_PROFILE_COOLDOWN",
      "PAYOUT_BELOW_MINIMUM",
      "PAYOUT_METHOD_NOT_ALLOWED",
      "PAYOUT_TOO_MANY_PENDING",
      "PAYOUT_COD_DUES_BLOCKED",
      "PAYOUT_EXCEEDS_AVAILABLE",
      "WITHDRAWAL_INVALID_STATUS",
    ]) {
      expect(errors[code]).toBeTruthy();
      expect(bnErrors[code]).toBeTruthy();
    }
  });
});
