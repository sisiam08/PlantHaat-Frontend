import { describe, expect, it } from "vitest";

import { heroTrustItems, readHeroTrust } from "./hero-trust";

describe("hero trust row", () => {
  it("shows pay-on-delivery only when cash on delivery is enabled", () => {
    expect(heroTrustItems({ codEnabled: true, windowHours: 48 }).map((item) => item.key)).toEqual([
      "trustPay",
      "trustVerified",
      "trustProblem",
    ]);
    expect(heroTrustItems({ codEnabled: false, windowHours: 48 }).map((item) => item.key)).toEqual([
      "trustVerified",
      "trustProblem",
    ]);
  });

  it("carries the complaint window from the setting, not a constant", () => {
    expect(heroTrustItems({ codEnabled: false, windowHours: 24 })).toEqual([
      { key: "trustVerified" },
      { key: "trustProblem", hours: 24 },
    ]);
    expect(heroTrustItems({ codEnabled: true, windowHours: 72 })[2]).toEqual({
      key: "trustProblem",
      hours: 72,
    });
  });

  it("reads the public settings keys", () => {
    expect(
      readHeroTrust({ "payment.cod.enabled": true, "return.windowHours": 36 }).map(
        (item) => item.key,
      ),
    ).toEqual(["trustPay", "trustVerified", "trustProblem"]);
    expect(readHeroTrust({ "payment.cod.enabled": false, "return.windowHours": 36 })).toHaveLength(
      2,
    );
  });

  it("omits the complaint item when the setting is missing or invalid", () => {
    expect(heroTrustItems({ codEnabled: true, windowHours: Number.NaN }).map((item) => item.key)).toEqual([
      "trustPay",
      "trustVerified",
    ]);
    expect(heroTrustItems({ codEnabled: true, windowHours: 0 }).map((item) => item.key)).toEqual([
      "trustPay",
      "trustVerified",
    ]);
  });
});
