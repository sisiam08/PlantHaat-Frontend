import { apiGet } from "@/lib/api/client";
import type { ProductListItem } from "@/lib/api/types";
import type { CatalogFilterOptions, CatalogPage, CatalogCursorMeta } from "./query";

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export type FeedPage = CatalogPage;

function normalizeMeta(
  meta: unknown,
  fallbackLimit: number,
): CatalogCursorMeta {
  const candidate = meta as Partial<CatalogCursorMeta> | undefined;
  const total = (meta as { total?: unknown } | undefined)?.total;
  return {
    limit: typeof candidate?.limit === "number" ? candidate.limit : fallbackLimit,
    nextCursor: typeof candidate?.nextCursor === "string" ? candidate.nextCursor : null,
    hasMore: candidate?.hasMore === true,
    total: typeof total === "number" ? total : undefined,
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

/** Browser-side catalog page fetch through the gateway (deterministic sorts). */
export async function fetchListPage(
  query: Record<string, unknown>,
  cursor: string | null,
  limit: number,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  const { data, meta } = await apiGet<ProductListItem[]>("/products", {
    signal,
    params: {
      ...query,
      pagination: "cursor",
      limit,
      includeTotal: cursor ? undefined : true,
      ...(cursor ? { cursor } : {}),
    },
  });
  return { data, meta: normalizeMeta(meta, limit) };
}

/** Browser-side filter facet values for the current category/search context. */
export async function fetchFilterOptions(params: {
  category?: string;
  q?: string;
}): Promise<CatalogFilterOptions> {
  const { data } = await apiGet<CatalogFilterOptions>("/products/filter-options", {
    params: {
      ...(params.category ? { category: params.category } : {}),
      ...(params.q ? { q: params.q } : {}),
    },
  });
  return data;
}
