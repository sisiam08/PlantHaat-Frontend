import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  /** @deprecated superseded by threaded replies; kept for old data. */
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  createdAt: string;
  images: { url: string }[];
  customer: { id: string; name: string | null; avatarUrl: string | null; deleted?: boolean };
  replyCount?: number;
}

export interface ReviewsMeta {
  limit?: number;
  page?: number;
  total?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  average?: number;
  distribution?: Record<string, number>;
}

export interface ReviewListParams {
  cursor?: string | null;
  rating?: number;
  withPhotos?: boolean;
  sort?: "newest" | "highest" | "lowest";
  limit?: number;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export const reviewsApi = {
  forProduct: (slug: string, params: ReviewListParams = {}) =>
    apiGet<ReviewView[]>(`/products/${encodeURIComponent(slug)}/reviews`, {
      params: {
        pagination: "cursor",
        limit: params.limit ?? 6,
        sort: params.sort ?? "newest",
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.rating ? { rating: params.rating } : {}),
        ...(params.withPhotos ? { withPhotos: true } : {}),
      },
    }).then((result) => ({
      data: result.data,
      meta: (result.meta ?? {}) as ReviewsMeta,
    })),
  create: (orderItemId: string, input: CreateReviewInput) =>
    apiPost<ReviewView>(`/orders/items/${encodeURIComponent(orderItemId)}/review`, input).then(
      (result) => result.data,
    ),
  update: (id: string, input: Partial<CreateReviewInput>) =>
    apiPatch<ReviewView>(`/reviews/${encodeURIComponent(id)}`, input).then((result) => result.data),
  remove: (id: string) =>
    apiDelete<null>(`/reviews/${encodeURIComponent(id)}`).then(() => undefined),
};
