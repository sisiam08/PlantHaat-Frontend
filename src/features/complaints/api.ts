import { apiGet, apiPost } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";

export type ComplaintType =
  | "DAMAGED_PLANT"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "NOT_DELIVERED"
  | "LATE_DELIVERY"
  | "OTHER";

export type ComplaintStatus =
  | "OPEN"
  | "SELLER_RESPONDED"
  | "UNDER_REVIEW"
  | "RESOLVED_REFUND"
  | "RESOLVED_REPLACEMENT"
  | "REJECTED"
  | "CLOSED";

export interface ComplaintCommentView {
  id: string;
  body: string;
  authorRole: string;
  authorId: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ComplaintView {
  id: string;
  type: ComplaintType;
  status: ComplaintStatus;
  description: string;
  resolutionNote: string | null;
  shopOrderId: string;
  orderItemId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: { url: string }[];
  shop?: { id: string; name: string; slug: string };
  comments?: ComplaintCommentView[];
}

export interface CreateComplaintInput {
  shopOrderId: string;
  orderItemId?: string;
  type: ComplaintType;
  description: string;
  attachments?: string[];
}

export const complaintsApi = {
  list: (params?: { status?: ComplaintStatus; page?: number }) =>
    apiGet<ComplaintView[]>("/complaints", { params }).then((result) => ({
      data: result.data,
      meta: result.meta as PaginationMeta | undefined,
    })),
  get: (id: string) =>
    apiGet<ComplaintView>(`/complaints/${encodeURIComponent(id)}`).then((result) => result.data),
  create: (input: CreateComplaintInput) =>
    apiPost<ComplaintView>("/complaints", input).then((result) => result.data),
  comment: (id: string, body: string) =>
    apiPost<ComplaintCommentView>(`/complaints/${encodeURIComponent(id)}/comments`, { body }).then(
      (result) => result.data,
    ),
};
