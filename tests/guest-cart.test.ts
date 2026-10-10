import { beforeEach, describe, expect, it } from "vitest";

import {
  addGuestLine,
  readGuestCart,
  removeGuestLine,
  setGuestQuantity,
} from "@/features/cart/guest-cart";

const snapshot = {
  productName: "Monstera",
  variantName: "Standard",
  slug: "monstera",
  priceDisplay: "850",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("guest cart", () => {
  it("merges duplicate lines and clamps to 20", () => {
    addGuestLine({ variantId: "v1", quantity: 5, snapshot });
    addGuestLine({ variantId: "v1", quantity: 30, snapshot });
    const lines = readGuestCart();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(20);
  });

  it("clamps on set and removes when quantity drops to zero", () => {
    addGuestLine({ variantId: "v1", quantity: 3, snapshot });
    setGuestQuantity("v1", -2);
    expect(readGuestCart()).toHaveLength(0);
  });

  it("removes a line", () => {
    addGuestLine({ variantId: "v1", quantity: 2, snapshot });
    removeGuestLine("v1");
    expect(readGuestCart()).toHaveLength(0);
  });
});
