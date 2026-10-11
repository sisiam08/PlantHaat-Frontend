import { apiGet } from "@/lib/api/client";
import type { ProductListItem } from "@/lib/api/types";

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedPage {
  data: ProductListItem[];
  meta: CursorMeta;
}

function normalizeMeta(
  meta: unknown,
  fallbackLimit: number,
): CursorMeta {
  const candidate = meta as Partial<CursorMeta> | undefined;
  return {
    limit: typeof candidate?.limit === "number" ? candidate.limit : fallbackLimit,
    nextCursor: typeof candidate?.nextCursor === "string" ? candidate.nextCursor : null,
    hasMore: candidate?.hasMore === true,
  };
}

/** Browser-side feed page fetch through the gateway (`sort=random` + cursor). */
export async function fetchFeedPage(
  seed: string,
  cursor: string | null,
  limit: number,
): Promise<FeedPage> {
  const { data, meta } = await apiGet<ProductListItem[]>("/products", {
    params: {
      sort: "random",
      seed,
      limit,
      inStock: true,
      ...(cursor ? { cursor } : {}),
    },
  });
  return { data, meta: normalizeMeta(meta, limit) };
}
