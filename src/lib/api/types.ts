import type { components } from "./schema";

export type PublicUser = components["schemas"]["PublicUserDto"];
export type AuthSessionResponse = components["schemas"]["AuthSessionResponseDto"];
export type PaginationMeta = components["schemas"]["PaginationMetaDto"];
export type District = components["schemas"]["DistrictDto"];
export type CategoryNode = components["schemas"]["CategoryNodeDto"];
export type ProductListItem = components["schemas"]["ProductListItemDto"];
export type ProductDetail = components["schemas"]["ProductDetailDto"];
export type ShopListItem = components["schemas"]["ShopListItemDto"];
export type ShopDetail = components["schemas"]["ShopDetailDto"];
export type HomeResponse = components["schemas"]["HomeResponseDto"];
export type NotificationItem = components["schemas"]["NotificationItemDto"];
export type SellerDashboard = components["schemas"]["SellerDashboardDto"];
export type SellerEarnings = components["schemas"]["SellerEarningsDto"];
export type PaymentDto = components["schemas"]["PaymentDto"];

export type Role = "CUSTOMER" | "SELLER" | "ADMIN";
