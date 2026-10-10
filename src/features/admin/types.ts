/**
 * Admin console types hand-written from the backend DTOs/services, because the
 * OpenAPI spec has no (or only partial) response schemas for most admin
 * endpoints (see FRONTEND_CONTEXT.md §9 backend change request #6).
 *
 * Exception: the analytics overview now has a generated schema, so it is
 * re-exported from `components["schemas"]["AdminAnalyticsOverviewDto"]`.
 */

import type { components } from "@/lib/api/schema";

export type SellerStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type SellerType = "NURSERY" | "INDIVIDUAL_GROWER" | "RESELLER";
export type SellerDocumentType =
  | "NID_FRONT"
  | "NID_BACK"
  | "TRADE_LICENSE"
  | "NURSERY_PHOTO"
  | "OTHER";
export type PayoutMethod = "BKASH" | "NAGAD" | "ROCKET" | "BANK";
export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";
export type ShopStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED"
  | "REMOVED";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED_DELIVERY";
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
export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";
export type PaymentMethod = "COD" | "PIPRAPAY" | "BKASH" | "NAGAD" | "CARD" | "BANK_TRANSFER";
export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";
export type ReportStatus = "OPEN" | "RESOLVED_HIDDEN" | "RESOLVED_KEPT";
export type ReviewStatus = "VISIBLE" | "HIDDEN";
export type LedgerEntryType =
  | "ORDER_EARNING"
  | "COD_COMMISSION_DUE"
  | "PAYOUT"
  | "DUES_PAYMENT"
  | "REFUND_REVERSAL"
  | "ADJUSTMENT";
export type CommissionScope = "GLOBAL" | "CATEGORY" | "SELLER";
export type AnnouncementAudience = "ALL" | "CUSTOMERS" | "SELLERS";
export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type HomepageSectionType =
  | "FEATURED_CATEGORIES"
  | "FEATURED_PRODUCTS"
  | "FEATURED_SHOPS"
  | "NEW_ARRIVALS"
  | "BANNER_STRIP";

/* ───────────────────────── Dashboard / analytics ───────────────────────── */

export type AdminAnalyticsOverview = components["schemas"]["AdminAnalyticsOverviewDto"];

/* ───────────────────────── Sellers ───────────────────────── */

export interface AdminSellerUserSummary {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: UserStatus;
}

export interface AdminSellerShopSummary {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
}

export interface AdminSellerDocument {
  id: string;
  sellerProfileId: string;
  type: SellerDocumentType;
  fileKey: string;
  createdAt: string;
}

export interface AdminPayoutAccount {
  id: string;
  method: PayoutMethod;
  accountName: string;
  accountMasked: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AdminSellerListItem {
  id: string;
  userId: string;
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
  createdAt: string;
  user: AdminSellerUserSummary;
  shops: AdminSellerShopSummary[];
}

export interface AdminSellerDetail extends Omit<AdminSellerListItem, "user"> {
  user: AdminSellerUserSummary;
  documents: AdminSellerDocument[];
  shops: AdminSellerShopSummary[];
  payoutAccounts: AdminPayoutAccount[];
}

export interface LedgerEntryView {
  id: string;
  sellerProfileId: string;
  shopOrderId: string | null;
  payoutId: string | null;
  type: LedgerEntryType;
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface DuesAdjustmentResult {
  balance: string;
}

/* ───────────────────────── Users ───────────────────────── */

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  _count: { orders: number; addresses: number; reviews: number; complaints: number };
  sellerProfile: { id: string; status: SellerStatus; businessName: string } | null;
}

/* ───────────────────────── Shops ───────────────────────── */

export interface AdminShopListItem {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  isOnVacation: boolean;
  ratingAvg: string | number;
  ratingCount: number;
  district: string | null;
  createdAt: string;
  suspensionReason: string | null;
  sellerProfile: { id: string; businessName: string; status: SellerStatus };
}

/* ───────────────────────── Products ───────────────────────── */

export interface AdminProductListItem {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  status: ProductStatus;
  rejectionReason: string | null;
  minPrice: string | number | null;
  maxPrice: string | number | null;
  inStock: boolean;
  soldCount: number;
  viewCount: number;
  ratingAvg: string | number;
  ratingCount: number;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  shop: { id: string; name: string; sellerProfile: { userId: string } };
}

/* ───────────────────────── Categories ───────────────────────── */

export interface AdminCategory {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  _count: { products: number; children: number };
}

export interface CategoryInput {
  name: string;
  nameBn?: string;
  slug?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/* ───────────────────────── Orders ───────────────────────── */

export interface AdminPaymentView {
  id: string;
  orderId: string;
  shopOrderId: string | null;
  method: PaymentMethod;
  provider: string | null;
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerTxnId: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface AdminOrderItemView {
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

export interface AdminOrderStatusHistoryView {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByRole: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminShopOrderView {
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
  items: AdminOrderItemView[];
  statusHistory: AdminOrderStatusHistoryView[];
  payments: AdminPaymentView[];
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

/* ───────────────────────── Payments ───────────────────────── */

export interface AdminPaymentListItem {
  id: string;
  orderId: string;
  orderNumber: string;
  shopOrderId: string | null;
  shopOrderNumber: string | null;
  amount: string;
  currency: string;
  method: PaymentMethod;
  provider: string | null;
  status: PaymentStatus;
  providerTxnId: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

/* ───────────────────────── Refunds ───────────────────────── */

export interface AdminRefundView {
  id: string;
  shopOrderId: string;
  paymentId: string | null;
  complaintId: string | null;
  amount: string;
  reason: string;
  status: RefundStatus;
  method: PaymentMethod | null;
  reference: string | null;
  note: string | null;
  requestedById: string;
  processedById: string | null;
  createdAt: string;
  processedAt: string | null;
  shopOrder: { id: string; shopOrderNumber: string; commissionAmount: string };
}

/* ───────────────────────── Payouts & commission ───────────────────────── */

export interface AdminPayoutView {
  id: string;
  payoutNumber: string;
  sellerProfileId: string;
  amount: string;
  status: PayoutStatus;
  method: PayoutMethod | null;
  accountMasked: string | null;
  reference: string | null;
  note: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  processedById: string | null;
  processedAt: string | null;
  createdAt: string;
  sellerProfile: { id: string; businessName: string };
}

export interface CreatePayoutInput {
  sellerProfileId: string;
  amount: number;
  method?: PayoutMethod;
  reference?: string;
  note?: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface UpdatePayoutInput {
  status?: PayoutStatus;
  method?: PayoutMethod;
  reference?: string;
  note?: string;
}

export interface AdminCommissionRule {
  id: string;
  scope: CommissionScope;
  categoryId: string | null;
  sellerProfileId: string | null;
  ratePercent: string | number;
  isActive: boolean;
  effectiveFrom: string;
  createdById: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  sellerProfile: { id: string; businessName: string } | null;
}

export interface CreateCommissionRuleInput {
  scope: CommissionScope;
  categoryId?: string;
  sellerProfileId?: string;
  ratePercent: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

export interface UpdateCommissionRuleInput {
  ratePercent?: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

/* ───────────────────────── Complaints ───────────────────────── */

export interface AdminComplaintComment {
  id: string;
  complaintId: string;
  authorId: string;
  authorRole: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface AdminComplaintView {
  id: string;
  ticketNumber: string;
  shopOrderId: string;
  orderItemId: string | null;
  customerId: string;
  shopId: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: { id: string; url: string; createdAt: string }[];
  shop?: { id: string; name: string; slug: string };
  comments?: AdminComplaintComment[];
  refunds?: AdminRefundView[];
}

/* ───────────────────────── Reviews ───────────────────────── */

export interface AdminReviewReportView {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  review: {
    id: string;
    productId: string;
    shopId: string;
    customerId: string;
    rating: number;
    title: string | null;
    comment: string | null;
    status: ReviewStatus;
    sellerReply: string | null;
    createdAt: string;
    shop: { id: string; name: string };
  };
}

/* ───────────────────────── Content ───────────────────────── */

export interface AdminBanner {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface BannerInput {
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  placement?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

export interface AdminHomepageSection {
  id: string;
  key: string;
  title: string;
  titleBn: string | null;
  type: HomepageSectionType;
  itemIds: string[];
  config: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface HomepageSectionInput {
  key: string;
  title: string;
  titleBn?: string;
  type: HomepageSectionType;
  itemIds?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  expiresAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
  publishedAt?: string;
  expiresAt?: string;
}

/* ───────────────────────── Audit logs & settings ───────────────────────── */

export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type AdminSettings = Record<string, unknown>;
