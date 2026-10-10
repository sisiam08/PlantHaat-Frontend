/**
 * Seller types are re-exported aliases over the generated OpenAPI schemas
 * (`components["schemas"]["Seller*Dto"]`), so field names stay in sync with the
 * backend spec. Public names are kept stable for existing imports.
 */

import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

/* ───────────────────────── enums ───────────────────────── */

export type SellerStatus = Schemas["SellerApplicationDto"]["status"];
export type SellerType = Schemas["SellerApplicationDto"]["sellerType"];
export type SellerDocumentType = Schemas["SellerDocumentDto"]["type"];
export type PayoutMethod = Schemas["SellerPayoutAccountDto"]["method"];
export type ShopStatus = Schemas["SellerShopRefDto"]["status"];
export type ProductStatus = Schemas["SellerProductListItemDto"]["status"];
export type LightRequirement = NonNullable<Schemas["CreateProductDto"]["lightRequirement"]>;
export type WateringFrequency = NonNullable<Schemas["CreateProductDto"]["wateringFrequency"]>;
export type CareDifficulty = NonNullable<Schemas["CreateProductDto"]["careDifficulty"]>;
export type InventoryReason = Schemas["AdjustStockDto"]["reason"];
export type OrderStatus = Schemas["SellerShopOrderDto"]["status"];
export type CancellationRequestStatus = Schemas["SellerCancellationRequestDto"]["status"];
export type ComplaintStatus = Schemas["SellerComplaintDetailDto"]["status"];
export type ComplaintType = Schemas["SellerComplaintDetailDto"]["type"];
export type LedgerEntryType = Schemas["SellerLedgerEntryDto"]["type"];
export type PayoutStatus = Schemas["SellerPayoutDto"]["status"];

/* ───────────────────────── F5: onboarding & shop ───────────────────────── */

export type SellerDocumentView = Schemas["SellerDocumentDto"];
export type SellerApplicationShopSummary = Schemas["SellerShopRefDto"];
export type SellerApplication = Schemas["SellerApplicationDto"];
export type UpdateApplicationInput = Schemas["UpdateApplicationDto"];
export type AddDocumentInput = Schemas["AddDocumentDto"];

export type SellerShop = Schemas["SellerShopDto"];
export type UpdateShopInput = Schemas["UpdateShopDto"];
export type SetVacationInput = Schemas["SetVacationDto"];

export type DeliveryZone = Schemas["DeliveryZoneDto"];
export type DeliveryZoneInput = Schemas["CreateDeliveryZoneDto"];

export type PayoutAccount = Schemas["SellerPayoutAccountDto"];
export type CreatePayoutAccountInput = Schemas["CreatePayoutAccountDto"];

export type SellerDashboardCounters = Schemas["SellerDashboardDto"];

/* ───────────────────────── F6: products ───────────────────────── */

export type SellerCategorySummary = Schemas["SellerProductCategorySummaryDto"];
export type SellerVariantView = Schemas["SellerVariantDto"];
export type SellerProductImageView = Schemas["SellerProductImageDto"];
export type SellerProductView = Schemas["SellerProductDetailDto"];
export type SellerProductListItem = Schemas["SellerProductListItemDto"];

export type CreateProductInput = Schemas["CreateProductDto"];
export type UpdateProductInput = Schemas["UpdateProductDto"];

export type CreateVariantInput = Schemas["CreateVariantDto"];
export type UpdateVariantInput = Partial<Schemas["UpdateVariantDto"]>;

export type AdjustStockInput = Schemas["AdjustStockDto"];
export type AdjustedStockView = Schemas["VariantStockDto"];
export type ProductImageInput = Schemas["CreateProductImageDto"];

/* ───────────────────────── F6: orders ───────────────────────── */

export type SellerOrderItemView = Schemas["SellerOrderItemDto"];
export type SellerOrderStatusHistoryView = Schemas["SellerOrderStatusHistoryDto"];
export type SellerShopOrderView = Schemas["SellerShopOrderDto"];
export type TransitionOrderInput = Schemas["TransitionOrderDto"];
export type SellerCancellationRequestView = Schemas["SellerCancellationRequestDto"];
export type RespondCancellationInput = Schemas["RespondCancellationDto"];

/* ───────────────────────── F6: reviews ───────────────────────── */

export type SellerReviewView = Schemas["SellerReviewListItemDto"];

/* ───────────────────────── F6: complaints ───────────────────────── */

export type SellerComplaintCommentView = Schemas["ComplaintCommentResponseDto"];
export type SellerComplaintView = Schemas["SellerComplaintDetailDto"];

/* ───────────────────────── F6: earnings ───────────────────────── */

export type SellerLedgerEntry = Schemas["SellerLedgerEntryDto"];
export type SellerPayout = Schemas["SellerPayoutDto"];
export type SellerEarnings = Schemas["SellerEarningsDto"];

/* ───────────────────────── F6: analytics ───────────────────────── */

export type SellerAnalyticsOverview = Schemas["AnalyticsOverviewDto"];
