import { describe, expect, it } from "vitest";

import { selectableThanas, type ThanaView } from "@/features/locations/api";

function thana(overrides: Partial<ThanaView>): ThanaView {
  return {
    id: "t1",
    name: "Mirpur",
    nameBn: null,
    districtId: 1,
    dhakaZone: "CITY",
    selectableByCustomer: true,
    ...overrides,
  };
}

describe("selectableThanas", () => {
  it("hides non-address placeholder thanas", () => {
    const rows = [
      thana({ id: "a", name: "Mirpur" }),
      thana({ id: "b", name: "Zone Not Clear", selectableByCustomer: false }),
    ];
    expect(selectableThanas(rows).map((row) => row.name)).toEqual(["Mirpur"]);
  });

  it("de-duplicates names while keeping the first id", () => {
    const rows = [
      thana({ id: "first", name: "Kadamtali" }),
      thana({ id: "second", name: "Kadamtali" }),
      thana({ id: "third", name: "Savar", dhakaZone: "SUBURBAN" }),
    ];
    expect(selectableThanas(rows).map((row) => row.id)).toEqual(["first", "third"]);
  });
});
