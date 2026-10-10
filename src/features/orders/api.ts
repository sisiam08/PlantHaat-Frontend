import { apiGet, apiPost } from "@/lib/api/client";
import type { OrderDetailView, OrderSummaryView } from "./types";

export const ordersApi = {
  list: (params?: { status?: string; page?: number }) =>
    apiGet<OrderSummaryView[]>("/orders", { params }).then((result) => ({
      data: result.data,
      meta: result.meta,
    })),
  get: (id: string) =>
    apiGet<OrderDetailView>(`/orders/${encodeURIComponent(id)}`).then((result) => result.data),
  cancelShopOrder: (shopOrderId: string) =>
    apiPost<unknown>(`/orders/shop-orders/${encodeURIComponent(shopOrderId)}/cancel`, {}).then(
      () => undefined,
    ),
  requestCancellation: (shopOrderId: string, reason: string) =>
    apiPost<unknown>(
      `/orders/shop-orders/${encodeURIComponent(shopOrderId)}/cancellation-request`,
      { reason },
    ).then(() => undefined),
};
