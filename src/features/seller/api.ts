import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  AddDocumentInput,
  CreatePayoutAccountInput,
  DeliveryZone,
  DeliveryZoneInput,
  PayoutAccount,
  SellerApplication,
  SellerDashboardCounters,
  SellerDocumentView,
  SellerShop,
  SetVacationInput,
  UpdateApplicationInput,
  UpdateShopInput,
} from "./types";

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

  // Delivery zones
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
};
