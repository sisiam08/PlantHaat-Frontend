import "server-only";

import { serverGet } from "@/server/backend";
import { readAuthCookies } from "@/server/cookies";
import { ApiError } from "@/lib/api/common";
import type { AddressView } from "@/features/addresses/api";
import type { CartView } from "./types";

export interface CartServerData {
  signedIn: boolean;
  cart?: CartView;
}

async function readAccessToken(): Promise<string | undefined> {
  return (await readAuthCookies()).accessToken;
}

/**
 * Server-side first paint for the cart. Keeps the client query cache identical
 * to the browser key (`["cart", districtId]`) and never throws: any failure
 * falls back to the client-side fetch path.
 */
export async function getCartServerData(districtId = 0): Promise<CartServerData> {
  const token = await readAccessToken();
  if (!token) {
    return { signedIn: false };
  }
  try {
    const result = await serverGet<CartView>(
      districtId ? `/cart?districtId=${districtId}` : "/cart",
      { token },
    );
    return { signedIn: true, cart: result.data };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { signedIn: false };
    }
    return { signedIn: true };
  }
}

export interface CheckoutServerData {
  signedIn: boolean;
  addresses?: AddressView[];
  settings?: Record<string, unknown>;
  /**
   * Delivery-neutral cart (no district quote). Used as placeholder data while
   * the district-scoped quote loads, so the summary paints immediately and
   * the quote updates in place instead of collapsing.
   */
  previewCart?: CartView;
  districtId: number;
}

/**
 * One round of parallel server fetches for the checkout first paint. The
 * district-scoped cart quote is intentionally not awaited: it is the slowest
 * call and only affects delivery numbers, which refresh in place.
 */
export async function getCheckoutServerData(): Promise<CheckoutServerData> {
  const token = await readAccessToken();
  if (!token) {
    return { signedIn: false, districtId: 0 };
  }
  try {
    const [addresses, settings, previewCart] = await Promise.all([
      serverGet<AddressView[]>("/addresses", { token }),
      serverGet<Record<string, unknown>>("/settings/public", { token }),
      serverGet<CartView>("/cart", { token }).catch(() => undefined),
    ]);
    const list = addresses.data ?? [];
    const selected = list.find((address) => address.isDefault) ?? list[0];
    return {
      signedIn: true,
      addresses: list,
      settings: settings.data,
      previewCart: previewCart?.data,
      districtId: selected?.districtId ?? 0,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { signedIn: false, districtId: 0 };
    }
    return { signedIn: true, districtId: 0 };
  }
}
