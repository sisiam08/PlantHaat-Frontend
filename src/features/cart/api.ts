import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { CartView } from "./types";

export interface GuestQuoteShop {
  shopId: string;
  available: boolean;
  deliveryCharge: string | null;
  courierCharge: string | null;
  sellerExtraCharge: string;
  parcelWeightKg: string | null;
  lane: string | null;
  source: string | null;
  estimated: boolean;
  reason: string | null;
  freeDeliveryApplied: boolean;
  paymentMode: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
}

export interface GuestQuoteInput {
  districtId: number;
  thanaId?: string;
  shops: { shopId: string; items: { variantId: string; quantity: number }[] }[];
}

export const cartApi = {
  get: (districtId?: number, thanaId?: string) =>
    apiGet<CartView>("/cart", {
      params: { districtId, ...(thanaId ? { thanaId } : {}) },
    }).then((result) => result.data),
  putItem: (variantId: string, quantity: number) =>
    apiPut<CartView>("/cart/items", { variantId, quantity }).then((result) => result.data),
  removeItem: (variantId: string) =>
    apiDelete<CartView>(`/cart/items/${encodeURIComponent(variantId)}`).then(
      (result) => result.data,
    ),
  clear: () => apiDelete<CartView>("/cart").then((result) => result.data),
  previewGuest: (input: GuestQuoteInput) =>
    apiPost<{ shops: GuestQuoteShop[] }>("/delivery-quote/preview", input).then(
      (result) => result.data,
    ),
};




