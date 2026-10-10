import type {
  AdminSellerListItem,
  ComplaintStatus,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
  RefundStatus,
  ReportStatus,
  ReviewStatus,
  ShopStatus,
  UserStatus,
} from "./types";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function genericStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
    case "PAID":
    case "PROCESSED":
    case "RESOLVED_HIDDEN":
    case "RESOLVED_KEPT":
    case "DELIVERED":
    case "VISIBLE":
      return "default";
    case "REJECTED":
    case "SUSPENDED":
    case "REMOVED":
    case "FAILED":
    case "DEACTIVATED":
      return "destructive";
    default:
      return "secondary";
  }
}

export const sellerStatusVariant = (status: AdminSellerListItem["status"]): BadgeVariant =>
  genericStatusVariant(status);

export const shopStatusVariant = (status: ShopStatus): BadgeVariant => genericStatusVariant(status);

export const userStatusVariant = (status: UserStatus): BadgeVariant => genericStatusVariant(status);

export const productStatusVariant = (status: ProductStatus): BadgeVariant =>
  genericStatusVariant(status);

export function orderStatusVariant(status: OrderStatus): BadgeVariant {
  if (status === "CANCELLED" || status === "FAILED_DELIVERY") return "destructive";
  if (status === "DELIVERED") return "default";
  return "secondary";
}

export function complaintStatusVariant(status: ComplaintStatus): BadgeVariant {
  if (status === "REJECTED") return "destructive";
  if (status.startsWith("RESOLVED")) return "default";
  return "secondary";
}

export const refundStatusVariant = (status: RefundStatus): BadgeVariant => genericStatusVariant(status);

export const paymentStatusVariant = (status: PaymentStatus): BadgeVariant =>
  genericStatusVariant(status);

export const payoutStatusVariant = (status: PayoutStatus): BadgeVariant =>
  genericStatusVariant(status);

export const reportStatusVariant = (status: ReportStatus): BadgeVariant =>
  genericStatusVariant(status);

export const reviewStatusVariant = (status: ReviewStatus): BadgeVariant =>
  genericStatusVariant(status);
