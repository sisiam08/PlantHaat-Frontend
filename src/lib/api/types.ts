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

export interface HomeHighlightSlide {
  id: string;
  sortOrder: number;
  image: { url: string; width: number | null; height: number | null };
  mobileImage: { url: string; width: number | null; height: number | null } | null;
  alt: { bn: string; en: string };
  focal: { x: number; y: number };
  mobileFocal: { x: number; y: number };
  overlay: {
    enabled: boolean;
    headline: { bn: string; en: string };
    subtext: { bn: string; en: string };
    textColor: string | null;
    scrimColor: string;
    scrimOpacity: number;
    position: { desktop: string; mobile: string };
    align: { desktop: string; mobile: string };
  };
  button: {
    enabled: boolean;
    label: { bn: string; en: string };
    href: string | null;
    style: string;
    backgroundColor: string | null;
    textColor: string | null;
  } | null;
  link: string | null;
  openInNewTab: boolean;
}

export interface HomeHighlights {
  enabled: boolean;
  title: { bn: string; en: string };
  autoplay: boolean;
  intervalSeconds: number;
  slides: HomeHighlightSlide[];
}
