import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export interface QaAuthor {
  id: string | null;
  name: string | null;
  avatarUrl: string | null;
  deleted: boolean;
}

export interface QaReply {
  id: string;
  answerId: string | null;
  reviewId: string | null;
  body: string;
  isSellerReply: boolean;
  status: string;
  author: QaAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface QaAnswer {
  id: string;
  questionId: string;
  body: string;
  isSellerAnswer: boolean;
  status: string;
  author: QaAuthor;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  replies: QaReply[];
}

export interface QaQuestion {
  id: string;
  productId: string;
  body: string;
  status: string;
  author: QaAuthor;
  createdAt: string;
  updatedAt: string;
  answerCount: number;
  answers: QaAnswer[];
}

export interface QaMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface QaPage<T> {
  data: T[];
  meta: QaMeta;
}

function normalize<T>(result: { data: T[]; meta?: unknown }): QaPage<T> {
  const meta = result.meta as Partial<QaMeta> | undefined;
  return {
    data: result.data,
    meta: {
      limit: typeof meta?.limit === "number" ? meta.limit : result.data.length,
      nextCursor: typeof meta?.nextCursor === "string" ? meta.nextCursor : null,
      hasMore: meta?.hasMore === true,
      total: typeof meta?.total === "number" ? meta.total : undefined,
    },
  };
}

export const qaApi = {
  questions: (slug: string, cursor?: string | null, limit = 5) =>
    apiGet<QaQuestion[]>(`/products/${encodeURIComponent(slug)}/questions`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    }).then(normalize),

  question: (productId: string, body: string) =>
    apiPost<QaQuestion>(`/products/${encodeURIComponent(productId)}/questions`, { body }).then(
      (result) => result.data,
    ),
  updateQuestion: (id: string, body: string) =>
    apiPatch<QaQuestion>(`/questions/${encodeURIComponent(id)}`, { body }).then(
      (result) => result.data,
    ),
  deleteQuestion: (id: string) =>
    apiDelete<null>(`/questions/${encodeURIComponent(id)}`).then(() => undefined),

  answers: (questionId: string, cursor?: string | null, limit = 10) =>
    apiGet<QaAnswer[]>(`/questions/${encodeURIComponent(questionId)}/answers`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    }).then(normalize),

  answer: (questionId: string, body: string) =>
    apiPost<QaAnswer>(`/questions/${encodeURIComponent(questionId)}/answers`, { body }).then(
      (result) => result.data,
    ),
  updateAnswer: (id: string, body: string) =>
    apiPatch<QaAnswer>(`/answers/${encodeURIComponent(id)}`, { body }).then(
      (result) => result.data,
    ),
  deleteAnswer: (id: string) =>
    apiDelete<null>(`/answers/${encodeURIComponent(id)}`).then(() => undefined),

  answerReplies: (answerId: string, cursor?: string | null, limit = 10) =>
    apiGet<QaReply[]>(`/answers/${encodeURIComponent(answerId)}/replies`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    }).then(normalize),

  reviewReplies: (reviewId: string, cursor?: string | null, limit = 10) =>
    apiGet<QaReply[]>(`/reviews/${encodeURIComponent(reviewId)}/replies`, {
      params: { limit, ...(cursor ? { cursor } : {}) },
    }).then(normalize),

  replyToAnswer: (answerId: string, body: string) =>
    apiPost<QaReply>(`/answers/${encodeURIComponent(answerId)}/replies`, { body }).then(
      (result) => result.data,
    ),
  replyToReview: (reviewId: string, body: string) =>
    apiPost<QaReply>(`/reviews/${encodeURIComponent(reviewId)}/replies`, { body }).then(
      (result) => result.data,
    ),
  updateReply: (id: string, body: string) =>
    apiPatch<QaReply>(`/replies/${encodeURIComponent(id)}`, { body }).then(
      (result) => result.data,
    ),
  deleteReply: (id: string) =>
    apiDelete<null>(`/replies/${encodeURIComponent(id)}`).then(() => undefined),

  report: (kind: "questions" | "answers" | "replies" | "reviews", id: string, reason: string) =>
    apiPost<{ id: string }>(`/${kind}/${encodeURIComponent(id)}/report`, { reason }).then(
      (result) => result.data,
    ),
};
