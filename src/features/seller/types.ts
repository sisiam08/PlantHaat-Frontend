/**
 * Seller types hand-written from the backend DTOs/services, because the
 * OpenAPI spec has no response schemas for the seller endpoints yet
 * (see FRONTEND_CONTEXT.md §9 backend change request #6).
 */

export type SellerStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type SellerType = "NURSERY" | "INDIVIDUAL_GROWER" | "RESELLER";
export type SellerDocumentType =
  | "NID_FRONT"
  | "NID_BACK"
  | "TRADE_LICENSE"
  | "NURSERY_PHOTO"
  | "OTHER";
export type PayoutMethod = "BKASH" | "NAGAD" | "ROCKET" | "BANK";
export type ShopStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

export interface SellerDocumentView {
  id: string;
  sellerProfileId?: string;
  type: SellerDocumentType;
  fileKey: string;
  createdAt: string;
}

export interface SellerApplicationShopSummary {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
}

export interface SellerApplication {
  id: string;
  sellerType: SellerType;
  businessName: string;
  contactPhone: string;
  tradeLicenseNo: string | null;
  businessAddress: string;
  status: SellerStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  documents: SellerDocumentView[];
  shop: SellerApplicationShopSummary | null;
}

export interface UpdateApplicationInput {
  businessName?: string;
  sellerType?: SellerType;
  contactPhone?: string;
  businessAddress?: string;
  tradeLicenseNo?: string;
}

export interface AddDocumentInput {
  type: SellerDocumentType;
  fileKey: string;
}

export interface SellerShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  district: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  status: ShopStatus;
  isOnVacation: boolean;
  vacationUntil: string | null;
  vacationMessage: string | null;
  ratingAvg: string | number;
  ratingCount: number;
  approvedAt: string | null;
  createdAt: string;
}

export interface UpdateShopInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  phone?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface SetVacationInput {
  until?: string;
  message?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  isNationwide: boolean;
  charge: string | number;
  freeDeliveryAbove: string | number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  districts: { id: number; name: string; nameBn: string; division: string }[];
  createdAt: string;
}

export interface DeliveryZoneInput {
  name: string;
  isNationwide?: boolean;
  districtIds?: number[];
  charge: number;
  freeDeliveryAbove?: number;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
}

export interface PayoutAccount {
  id: string;
  method: PayoutMethod;
  accountName: string;
  accountMasked: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreatePayoutAccountInput {
  method: PayoutMethod;
  accountName: string;
  accountNumber: string;
  isDefault?: boolean;
}

export interface SellerDashboardCounters {
  sellerProfileId: string;
  pendingOrders: number;
  unreadNotifications: number;
  lowStockVariants: number;
}
