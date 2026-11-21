import type { NotificationItem } from "@/lib/api/types";

export const LOCALIZED_TYPES = new Set([
  "QUESTION_ASKED",
  "QUESTION_ANSWERED",
  "REPLY_RECEIVED",
  "ORDER_DELAYED",
  "REPLACEMENT_CREATED",
]);

export function notificationHref(item: NotificationItem): string | null {
  const data = (item.data ?? {}) as Record<string, unknown>;
  const slug = typeof data.productSlug === "string" ? data.productSlug : null;
  if (item.type === "QUESTION_ASKED") return "/seller/questions";
  if (item.type === "QUESTION_ANSWERED" && slug) return `/products/${slug}?tab=qa`;
  if (item.type === "REPLY_RECEIVED" && typeof data.reviewId === "string" && slug) {
    return `/products/${slug}?tab=reviews`;
  }
  if (item.type === "REPLY_RECEIVED" && slug) return `/products/${slug}?tab=qa`;
  if (
    (item.type === "ORDER_DELAYED" || item.type === "REPLACEMENT_CREATED") &&
    typeof data.orderId === "string"
  ) {
    return `/orders/${data.orderId}`;
  }
  if (typeof data.orderId === "string" && typeof data.intentId === "string") {
    const status = typeof data.status === "string" ? data.status : "";
    if (status === "UNDERPAID" || status === "REJECTED") {
      return `/checkout/payment/${data.orderId}`;
    }
    return `/orders/${data.orderId}`;
  }
  return null;
}
