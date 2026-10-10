import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  createdAt: string;
  images: { url: string }[];
  customer: { id: string; name: string; avatarUrl: string | null };
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export const reviewsApi = {
  forProduct: (slug: string, page = 1) =>
    apiGet<ReviewView[]>(`/products/${encodeURIComponent(slug)}/reviews`, { params: { page } }).then(
      (result) => ({ data: result.data, meta: result.meta as PaginationMeta | undefined }),
    ),
  create: (orderItemId: string, input: CreateReviewInput) =>
    apiPost<ReviewView>(`/orders/items/${encodeURIComponent(orderItemId)}/review`, input).then(
      (result) => result.data,
    ),
  update: (id: string, input: Partial<CreateReviewInput>) =>
    apiPatch<ReviewView>(`/reviews/${encodeURIComponent(id)}`, input).then((result) => result.data),
  remove: (id: string) =>
    apiDelete<null>(`/reviews/${encodeURIComponent(id)}`).then(() => undefined),
};
