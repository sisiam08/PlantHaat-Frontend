import { clearGuestCart, readGuestCart } from "./guest-cart";
import { cartApi } from "./api";
import { MAX_CART_QUANTITY } from "./types";

/**
 * On login/register, move local guest lines into the server cart, clamping each
 * variant to the max quantity (server + guest may differ).
 */
export async function mergeGuestCart(): Promise<void> {
  const guestLines = readGuestCart();
  if (guestLines.length === 0) {
    return;
  }

  let serverQuantities = new Map<string, number>();
  try {
    const serverCart = await cartApi.get();
    serverQuantities = new Map(
      serverCart.shops.flatMap((shop) => shop.items.map((item) => [item.variantId, item.quantity] as const)),
    );
  } catch {
    serverQuantities = new Map();
  }

  for (const line of guestLines) {
    const merged = Math.min(MAX_CART_QUANTITY, (serverQuantities.get(line.variantId) ?? 0) + line.quantity);
    try {
      await cartApi.putItem(line.variantId, merged);
    } catch {
      // Skip lines that can no longer be added (removed/unavailable variant).
    }
  }

  clearGuestCart();
}
