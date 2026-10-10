import type {
  CancellationRequestStatus,
  ComplaintStatus,
  OrderStatus,
  PayoutStatus,
  ProductStatus,
} from "./types";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function productStatusVariant(status: ProductStatus): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
      return "outline";
    case "REJECTED":
    case "REMOVED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function orderStatusVariant(status: OrderStatus | string): BadgeVariant {
  if (status === "CANCELLED" || status === "FAILED_DELIVERY") {
    return "destructive";
  }
  if (status === "DELIVERED") {
    return "default";
  }
  return "secondary";
}

export function complaintStatusVariant(status: ComplaintStatus): BadgeVariant {
  if (status === "REJECTED") {
    return "destructive";
  }
  if (status.startsWith("RESOLVED")) {
    return "default";
  }
  return "secondary";
}

export function cancellationStatusVariant(status: CancellationRequestStatus): BadgeVariant {
  if (status === "APPROVED") {
    return "default";
  }
  if (status === "REJECTED") {
    return "destructive";
  }
  return "secondary";
}

export function payoutStatusVariant(status: PayoutStatus): BadgeVariant {
  if (status === "PAID") {
    return "default";
  }
  if (status === "FAILED") {
    return "destructive";
  }
  return "secondary";
}
