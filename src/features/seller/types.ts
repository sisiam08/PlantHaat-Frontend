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

/* ───────────────────────── F6: products ───────────────────────── */

export type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED"
  | "REMOVED";

export type LightRequirement =
  | "FULL_SUN"
  | "PARTIAL_SHADE"
  | "SHADE"
  | "BRIGHT_INDIRECT"
  | "LOW_LIGHT";

export type WateringFrequency =
  | "DAILY"
  | "EVERY_2_3_DAYS"
  | "WEEKLY"
  | "FORTNIGHTLY"
  | "MINIMAL";

export type CareDifficulty = "EASY" | "MODERATE" | "HARD";

export type InventoryReason =
  | "INITIAL"
  | "RESTOCK"
  | "ADJUSTMENT"
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "RETURN";

export interface SellerCategorySummary {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
}

export interface SellerVariantView {
  id: string;
  name: string;
  sku: string | null;
  sizeLabel: string | null;
  heightCm: number | null;
  potType: string | null;
  potSizeInch: string | number | null;
  price: string | number;
  compareAtPrice: string | number | null;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface SellerProductImageView {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface SellerProductView {
  id: string;
  name: string;
  nameBn: string | null;
  scientificName: string | null;
  slug: string;
  description: string;
  careInstructions: string | null;
  lightRequirement: LightRequirement | null;
  wateringFrequency: WateringFrequency | null;
  careDifficulty: CareDifficulty | null;
  isIndoor: boolean | null;
  isPetSafe: boolean | null;
  matureHeightCm: number | null;
  tags: string[];
  careDetails: Record<string, unknown> | null;
  status: ProductStatus;
  rejectionReason: string | null;
  minPrice: string | number | null;
  maxPrice: string | number | null;
  inStock: boolean;
  ratingAvg: string | number;
  ratingCount: number;
  soldCount: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  category: SellerCategorySummary | null;
  variants: SellerVariantView[];
  images: SellerProductImageView[];
}

export interface SellerProductListItem {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  status: ProductStatus;
  minPrice: string | number | null;
  maxPrice: string | number | null;
  inStock: boolean;
  soldCount: number;
  viewCount: number;
  createdAt: string;
  category: SellerCategorySummary | null;
  variants: { id: string; price: string | number; stockQty: number; isActive: boolean }[];
  images: { id: string; url: string; isPrimary: boolean }[];
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  nameBn?: string;
  scientificName?: string;
  description: string;
  careInstructions?: string;
  lightRequirement?: LightRequirement;
  wateringFrequency?: WateringFrequency;
  careDifficulty?: CareDifficulty;
  isIndoor?: boolean;
  isPetSafe?: boolean;
  matureHeightCm?: number;
  tags?: string[];
  careDetails?: Record<string, unknown>;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateVariantInput {
  name: string;
  sku?: string;
  sizeLabel?: string;
  heightCm?: number;
  potType?: string;
  potSizeInch?: number;
  price: number;
  compareAtPrice?: number;
  stockQty?: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateVariantInput = Partial<CreateVariantInput>;

export interface AdjustStockInput {
  delta?: number;
  set?: number;
  reason?: InventoryReason;
}

export interface AdjustedStockView {
  id: string;
  stockQty: number;
  lowStockThreshold: number;
}

export interface ProductImageInput {
  url: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

/* ───────────────────────── F6: orders ───────────────────────── */

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED_DELIVERY";

export interface SellerOrderItemView {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  commissionAmount: string;
}

export interface SellerOrderStatusHistoryView {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByRole: string | null;
  note: string | null;
  createdAt: string;
}

export interface SellerShopOrderView {
  id: string;
  shopOrderNumber: string;
  orderId: string;
  shopId: string;
  status: OrderStatus;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  commissionAmount: string;
  sellerNetAmount: string;
  courierName: string | null;
  trackingCode: string | null;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  sellerNote: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: SellerOrderItemView[];
  statusHistory: SellerOrderStatusHistoryView[];
  shop: { id: string; name: string; slug: string };
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    paymentMethod: string;
  };
}

export interface TransitionOrderInput {
  status: OrderStatus;
  note?: string;
  courierName?: string;
  trackingCode?: string;
  estimatedDeliveryFrom?: string;
  estimatedDeliveryTo?: string;
  restock?: boolean;
}

export type CancellationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface SellerCancellationRequestView {
  id: string;
  shopOrderId: string;
  requestedById: string;
  reason: string;
  status: CancellationRequestStatus;
  respondedById: string | null;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  shopOrder: { id: string; shopOrderNumber: string; status: string; total: string };
}

export interface RespondCancellationInput {
  approve: boolean;
  note?: string;
}

/* ───────────────────────── F6: reviews ───────────────────────── */

export interface SellerReviewView {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "VISIBLE" | "HIDDEN";
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  createdAt: string;
  images: { id: string; url: string }[];
  product: { id: string; name: string; slug: string };
}

/* ───────────────────────── F6: complaints ───────────────────────── */

export type ComplaintStatus =
  | "OPEN"
  | "SELLER_RESPONDED"
  | "UNDER_REVIEW"
  | "RESOLVED_REFUND"
  | "RESOLVED_REPLACEMENT"
  | "REJECTED"
  | "CLOSED";

export type ComplaintType =
  | "DAMAGED_PLANT"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "NOT_DELIVERED"
  | "LATE_DELIVERY"
  | "OTHER";

export interface SellerComplaintCommentView {
  id: string;
  body: string;
  authorRole: string;
  authorId: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SellerComplaintView {
  id: string;
  ticketNumber: string;
  type: ComplaintType;
  status: ComplaintStatus;
  description: string;
  resolutionNote: string | null;
  shopOrderId: string;
  orderItemId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: { id: string; url: string }[];
  shop?: { id: string; name: string; slug: string };
  comments?: SellerComplaintCommentView[];
}

/* ───────────────────────── F6: earnings ───────────────────────── */

export type LedgerEntryType =
  | "ORDER_EARNING"
  | "COD_COMMISSION_DUE"
  | "PAYOUT"
  | "DUES_PAYMENT"
  | "REFUND_REVERSAL"
  | "ADJUSTMENT";

export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

export interface SellerLedgerEntry {
  id: string;
  sellerProfileId: string;
  shopOrderId: string | null;
  payoutId: string | null;
  type: LedgerEntryType;
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface SellerPayout {
  id: string;
  payoutNumber: string;
  amount: string;
  status: PayoutStatus;
  method: PayoutMethod | null;
  accountMasked: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface SellerEarnings {
  balance: string;
  ledger: SellerLedgerEntry[];
  payouts: SellerPayout[];
}

/* ───────────────────────── F6: analytics ───────────────────────── */

export interface SellerAnalyticsOverview {
  range: { from: string; to: string };
  sellerProfileId: string;
  shopId: string;
  ordersByStatus: Record<string, number>;
  deliveredOrders: number;
  revenue: string;
  commissionPaid: string;
  averageOrderValue: string;
  topProducts: { id: string; name: string; soldCount: number; ratingAvg: string | number }[];
  lowStock: {
    id: string;
    name: string;
    stockQty: number;
    lowStockThreshold: number;
    product: { name: string };
  }[];
  rating: { avg: string | number; count: number };
  dailySeries: { date: string; orders: number; revenue: string }[];
}
