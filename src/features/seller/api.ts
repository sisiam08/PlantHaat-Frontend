import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";
import type {
  AddDocumentInput,
  AdjustedStockView,
  AdjustStockInput,
  CreatePayoutAccountInput,
  CreateProductInput,
  CreateVariantInput,
  SellerAnalyticsOverview,
  SellerShop,
  DeliveryZone,
  DeliveryZoneInput,
  DeliveryCondition,
  DeliveryConditionInput,
  DeliveryConditionView,
  PayoutAccount,
  ProductImageInput,
  RespondCancellationInput,
  SellerApplication,
  SellerCancellationRequestView,
  SellerComplaintView,
  SellerDashboardCounters,
  SellerDocumentView,
  SellerEarnings,
  SellerProductListItem,
  SellerProductView,
  SellerReviewView,
  SellerShopOrderView,
  SetVacationInput,
  TransitionOrderInput,
  UpdateApplicationInput,
  UpdateProductInput,
  UpdateShopInput,
  UpdateVariantInput,
} from "./types";

function paginated<T>(result: { data: T[]; meta?: PaginationMeta }) {
  return { data: result.data, meta: result.meta };
}

export const sellerApi = {
  // Dashboard (requires an approved seller with an active shop)
  dashboard: () =>
    apiGet<SellerDashboardCounters>("/seller/dashboard").then((result) => result.data),

  // Onboarding application
  getApplication: () =>
    apiGet<SellerApplication>("/seller/application").then((result) => result.data),
  updateApplication: (input: UpdateApplicationInput) =>
    apiPatch<SellerApplication>("/seller/application", input).then((result) => result.data),
  addDocument: (input: AddDocumentInput) =>
    apiPost<SellerDocumentView>("/seller/application/documents", input).then(
      (result) => result.data,
    ),
  removeDocument: (id: string) =>
    apiDelete<unknown>(`/seller/application/documents/${encodeURIComponent(id)}`).then(
      () => undefined,
    ),
  submitApplication: () =>
    apiPost<SellerApplication>("/seller/application/submit").then((result) => result.data),

  // Shop
  getShop: () => apiGet<SellerShop>("/seller/shop").then((result) => result.data),
  updateShop: (input: UpdateShopInput) =>
    apiPatch<SellerShop>("/seller/shop", input).then((result) => result.data),
  setVacation: (input: SetVacationInput) =>
    apiPost<SellerShop>("/seller/shop/vacation", input).then((result) => result.data),
  clearVacation: () => apiDelete<SellerShop>("/seller/shop/vacation").then((result) => result.data),

  listDeliveryConditions: () =>
    apiGet<DeliveryConditionView[]>("/seller/delivery-conditions").then((result) => result.data),
  upsertDeliveryCondition: (condition: DeliveryCondition, input: DeliveryConditionInput) =>
    apiPut<DeliveryConditionView>(
      `/seller/delivery-conditions/${encodeURIComponent(condition)}`,
      input,
    ).then((result) => result.data),

  // Legacy delivery zones
  listZones: () => apiGet<DeliveryZone[]>("/seller/delivery-zones").then((result) => result.data),
  createZone: (input: DeliveryZoneInput) =>
    apiPost<DeliveryZone>("/seller/delivery-zones", input).then((result) => result.data),
  updateZone: (id: string, input: Partial<DeliveryZoneInput>) =>
    apiPatch<DeliveryZone>(`/seller/delivery-zones/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeZone: (id: string) =>
    apiDelete<unknown>(`/seller/delivery-zones/${encodeURIComponent(id)}`).then(() => undefined),

  // Payout accounts
  listPayoutAccounts: () =>
    apiGet<PayoutAccount[]>("/seller/payout-accounts").then((result) => result.data),
  createPayoutAccount: (input: CreatePayoutAccountInput) =>
    apiPost<PayoutAccount>("/seller/payout-accounts", input).then((result) => result.data),
  removePayoutAccount: (id: string) =>
    apiDelete<unknown>(`/seller/payout-accounts/${encodeURIComponent(id)}`).then(() => undefined),

  /* ───────────────────────── F6: products ───────────────────────── */
  listProducts: () =>
    apiGet<SellerProductListItem[]>("/seller/products").then((result) => paginated(result)),
  createProduct: (input: CreateProductInput) =>
    apiPost<SellerProductView>("/seller/products", input).then((result) => result.data),
  getProduct: (id: string) =>
    apiGet<SellerProductView>(`/seller/products/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  updateProduct: (id: string, input: UpdateProductInput) =>
    apiPatch<SellerProductView>(`/seller/products/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeProduct: (id: string) =>
    apiDelete<unknown>(`/seller/products/${encodeURIComponent(id)}`).then(() => undefined),
  setProductStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    apiPost<SellerProductView>(`/seller/products/${encodeURIComponent(id)}/status`, {
      status,
    }).then((result) => result.data),
  addVariant: (productId: string, input: CreateVariantInput) =>
    apiPost<SellerProductView>(
      `/seller/products/${encodeURIComponent(productId)}/variants`,
      input,
    ).then((result) => result.data),
  updateVariant: (productId: string, variantId: string, input: UpdateVariantInput) =>
    apiPatch<SellerProductView>(
      `/seller/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      input,
    ).then((result) => result.data),
  removeVariant: (productId: string, variantId: string) =>
    apiDelete<unknown>(
      `/seller/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    ).then(() => undefined),
  adjustStock: (variantId: string, input: AdjustStockInput) =>
    apiPost<AdjustedStockView>(
      `/seller/variants/${encodeURIComponent(variantId)}/stock`,
      input,
    ).then((result) => result.data),
  addImage: (productId: string, input: ProductImageInput) =>
    apiPost<SellerProductView>(
      `/seller/products/${encodeURIComponent(productId)}/images`,
      input,
    ).then((result) => result.data),
  updateImage: (
    productId: string,
    imageId: string,
    input: { altText?: string; sortOrder?: number; isPrimary?: boolean },
  ) =>
    apiPatch<SellerProductView>(
      `/seller/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
      input,
    ).then((result) => result.data),
  removeImage: (productId: string, imageId: string) =>
    apiDelete<SellerProductView>(
      `/seller/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
    ).then((result) => result.data),

  /* ───────────────────────── F6: orders ───────────────────────── */
  listOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<SellerShopOrderView[]>("/seller/orders", { params }).then((result) =>
      paginated(result),
    ),
  getOrder: (id: string) =>
    apiGet<SellerShopOrderView>(`/seller/orders/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  transitionOrder: (id: string, input: TransitionOrderInput) =>
    apiPost<SellerShopOrderView>(`/seller/orders/${encodeURIComponent(id)}/status`, input).then(
      (result) => result.data,
    ),
  listCancellationRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<SellerCancellationRequestView[]>("/seller/cancellation-requests", { params }).then(
      (result) => paginated(result),
    ),
  respondCancellation: (id: string, input: RespondCancellationInput) =>
    apiPost<{ handled: boolean; approved: boolean }>(
      `/seller/cancellation-requests/${encodeURIComponent(id)}/respond`,
      input,
    ).then((result) => result.data),

  /* ───────────────────────── F6: reviews ───────────────────────── */
  listReviews: (params?: { page?: number; limit?: number }) =>
    apiGet<SellerReviewView[]>("/seller/reviews", { params }).then((result) =>
      paginated(result),
    ),
  replyReview: (id: string, reply: string) =>
    apiPost<SellerReviewView>(`/seller/reviews/${encodeURIComponent(id)}/reply`, { reply }).then(
      (result) => result.data,
    ),
  reportReview: (id: string, reason: string) =>
    apiPost<{ id: string }>(`/seller/reviews/${encodeURIComponent(id)}/report`, { reason }).then(
      (result) => result.data,
    ),

  /* ───────────────────────── F6: complaints ───────────────────────── */
  listComplaints: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<SellerComplaintView[]>("/seller/complaints", { params }).then((result) =>
      paginated(result),
    ),
  getComplaint: (id: string) =>
    apiGet<SellerComplaintView>(`/seller/complaints/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  commentComplaint: (id: string, body: string, attachments?: string[]) =>
    apiPost<{ id: string }>(`/seller/complaints/${encodeURIComponent(id)}/comments`, {
      body,
      ...(attachments?.length ? { attachments } : {}),
    }).then((result) => result.data),

  /* ───────────────────────── F6: earnings & analytics ───────────────────────── */
  getEarnings: () => apiGet<SellerEarnings>("/seller/earnings").then((result) => result.data),
  getAnalytics: (params?: { from?: string; to?: string }) =>
    apiGet<SellerAnalyticsOverview>("/seller/analytics/overview", { params }).then(
      (result) => result.data,
    ),
  getPanels: (params?: { from?: string; to?: string }) =>
    apiGet<import("./types").SellerPanels>("/seller/analytics/panels", { params }).then(
      (result) => result.data,
    ),
};

/* Part 4: wallet, payout profile and withdrawals. */
export const sellerWalletApi = {
  get: () => apiGet<import("./types").SellerWallet>("/seller/wallet").then((r) => r.data),
  transactions: (params?: { page?: number; limit?: number; type?: string }) =>
    apiGet<import("./types").SellerWalletTransaction[]>("/seller/wallet/transactions", {
      params,
    }).then((r) => paginated(r)),
  getProfile: () =>
    apiGet<import("./types").SellerWallet["payoutProfile"]>("/seller/wallet/payout-profile").then(
      (r) => r.data,
    ),
  saveProfile: (input: import("./types").PayoutProfileInput) =>
    apiPut<NonNullable<import("./types").SellerWallet["payoutProfile"]>>(
      "/seller/wallet/payout-profile",
      input,
    ).then((r) => r.data),
  listWithdrawals: (params?: { page?: number; limit?: number; status?: string }) =>
    apiGet<import("./types").SellerWithdrawal[]>("/seller/wallet/withdrawals", {
      params,
    }).then((r) => paginated(r)),
  requestWithdrawal: (
    input: { amount: number; method?: import("./types").PayoutMethod },
    idempotencyKey: string,
  ) =>
    apiPost<import("./types").SellerWithdrawal>("/seller/wallet/withdrawals", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    }).then((r) => r.data),
};
