import { apiDelete, apiGet, apiPut } from "@/lib/api/client";
import type { CartView } from "./types";

export const cartApi = {
  get: (districtId?: number) =>
    apiGet<CartView>("/cart", districtId ? { params: { districtId } } : undefined).then(
      (result) => result.data,
    ),
  putItem: (variantId: string, quantity: number) =>
    apiPut<CartView>("/cart/items", { variantId, quantity }).then((result) => result.data),
  removeItem: (variantId: string) =>
    apiDelete<CartView>(`/cart/items/${encodeURIComponent(variantId)}`).then(
      (result) => result.data,
    ),
  clear: () => apiDelete<CartView>("/cart").then((result) => result.data),
};
