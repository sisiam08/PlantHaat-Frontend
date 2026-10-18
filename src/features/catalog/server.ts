import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Paginated, PaginationMeta } from "@/lib/api/common";
import type {
  CategoryNode,
  District,
  HomeResponse,
  ProductDetail,
  ProductListItem,
  ShopDetail,
  ShopListItem,
} from "@/lib/api/types";
import { serverRequest } from "@/server/backend";
import { CACHE_TAGS, productTag, productReviewsTag, shopTag } from "@/server/cache-tags";
import type { ProductQuery, CatalogPage } from "./query";

function toParams(query: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) {
      params[key] = value;
    }
  }
  return params;
}

function requireMeta(meta: PaginationMeta | undefined, limit = 20): PaginationMeta {
  return meta ?? { page: 1, limit, total: 0, totalPages: 0 };
}

export async function getHome(): Promise<HomeResponse> {
  "use cache";
  cacheTag(CACHE_TAGS.home, CACHE_TAGS.banners, CACHE_TAGS.categories);
  cacheLife("minutes");
  const { data } = await serverRequest<HomeResponse>({ method: "GET", url: "/home" });
  return data;
}

export async function getCategories(): Promise<CategoryNode[]> {
  "use cache";
  cacheTag(CACHE_TAGS.categories);
  cacheLife("hours");
  const { data } = await serverRequest<CategoryNode[]>({ method: "GET", url: "/categories" });
  return data;
}

export async function getDistricts(): Promise<District[]> {
  "use cache";
  cacheTag(CACHE_TAGS.categories);
  cacheLife("hours");
  const { data } = await serverRequest<District[]>({
    method: "GET",
    url: "/locations/districts",
  });
  return data;
}

export async function getProducts(query: ProductQuery): Promise<Paginated<ProductListItem>> {
  "use cache";
  cacheTag(CACHE_TAGS.products);
  cacheLife("minutes");
  const { data, meta } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: "/products",
    params: toParams(query as Record<string, unknown>),
  });
  return { data, meta: requireMeta(meta, query.limit ?? 20) };
}

/**
 * Cached first page of the /products list: keyset-cursor mode with
 * `includeTotal` for the "N plants found" label. Later pages are fetched
 * client-side through the gateway.
 */
export async function getProductsCursorPage(
  query: ProductQuery,
  limit: number,
): Promise<CatalogPage> {
  "use cache";
  cacheTag(CACHE_TAGS.products);
  cacheLife("minutes");
  const { data, meta } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: "/products",
    params: {
      ...toParams(query as Record<string, unknown>),
      pagination: "cursor",
      includeTotal: true,
      limit,
    },
  });
  const candidate = meta as Partial<CatalogPage["meta"]> | undefined;
  return {
    data,
    meta: {
      limit: typeof candidate?.limit === "number" ? candidate.limit : limit,
      nextCursor: typeof candidate?.nextCursor === "string" ? candidate.nextCursor : null,
      hasMore: candidate?.hasMore === true,
      total: typeof candidate?.total === "number" ? candidate.total : undefined,
    },
  };
}

export interface FeedPage {
  data: ProductListItem[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export const FEED_SEED_BUCKET_MS = 15 * 60 * 1000;

/**
 * Seed + cached first page of the home feed in one `use cache` unit:
 * the 15-minute seed is a time value, so it is computed inside the cache
 * fill (Cache Components rejects `Date.now()` during shell prerender).
 */
export async function getHomeFeed(
  limit: number,
): Promise<{ seed: string; page: FeedPage }> {
  "use cache";
  cacheTag(CACHE_TAGS.products);
  cacheLife("minutes");
  const seed = String(Math.floor(Date.now() / FEED_SEED_BUCKET_MS));
  const { data, meta } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: "/products",
    params: { sort: "random", seed, limit, inStock: true },
  });
  const cursorMeta = meta as unknown as
    | { limit?: number; nextCursor?: string | null; hasMore?: boolean }
    | undefined;
  return {
    seed,
    page: {
      data,
      meta: {
        limit: cursorMeta?.limit ?? limit,
        nextCursor: typeof cursorMeta?.nextCursor === "string" ? cursorMeta.nextCursor : null,
        hasMore: cursorMeta?.hasMore === true,
      },
    },
  };
}

/** Cached first page of the home random feed, keyed by the 15-minute seed. */
export async function getProductFeedPage(seed: string, limit: number): Promise<FeedPage> {
  "use cache";
  cacheTag(CACHE_TAGS.products);
  cacheLife("minutes");
  const { data, meta } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: "/products",
    params: { sort: "random", seed, limit, inStock: true },
  });
  const cursorMeta = meta as unknown as
    | { limit?: number; nextCursor?: string | null; hasMore?: boolean }
    | undefined;
  return {
    data,
    meta: {
      limit: cursorMeta?.limit ?? limit,
      nextCursor: typeof cursorMeta?.nextCursor === "string" ? cursorMeta.nextCursor : null,
      hasMore: cursorMeta?.hasMore === true,
    },
  };
}

export async function getRelated(slug: string, limit = 6): Promise<ProductListItem[]> {
  "use cache";
  cacheTag(CACHE_TAGS.products, productTag(slug));
  cacheLife("minutes");
  const { data } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: `/products/${encodeURIComponent(slug)}/related`,
    params: { limit },
  });
  return data;
}

/**
 * Product detail. Returns `null` for a genuine backend 404 so callers can call
 * `notFound()`; any other failure (network/gateway) still throws so it reaches
 * the route error boundary. The 404 is resolved *inside* the cached function
 * because custom `ApiError` fields are lost when the error crosses the
 * `use cache` boundary.
 */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(CACHE_TAGS.products, productTag(slug), productReviewsTag(slug));
  cacheLife("minutes");
  try {
    const { data } = await serverRequest<ProductDetail>({
      method: "GET",
      url: `/products/${encodeURIComponent(slug)}`,
    });
    return data;
  } catch (error) {
    if ((error as { status?: unknown })?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getShops(page = 1): Promise<Paginated<ShopListItem>> {
  "use cache";
  cacheTag(CACHE_TAGS.shops);
  cacheLife("minutes");
  const { data, meta } = await serverRequest<ShopListItem[]>({
    method: "GET",
    url: "/shops",
    params: { page },
  });
  return { data, meta: requireMeta(meta) };
}

export async function getShop(slug: string): Promise<ShopDetail> {
  "use cache";
  cacheTag(CACHE_TAGS.shops, shopTag(slug));
  cacheLife("minutes");
  const { data } = await serverRequest<ShopDetail>({
    method: "GET",
    url: `/shops/${encodeURIComponent(slug)}`,
  });
  return data;
}

export async function getShopProducts(
  slug: string,
  query: ProductQuery,
): Promise<Paginated<ProductListItem>> {
  "use cache";
  cacheTag(CACHE_TAGS.shops, shopTag(slug), CACHE_TAGS.products);
  cacheLife("minutes");
  const { data, meta } = await serverRequest<ProductListItem[]>({
    method: "GET",
    url: `/shops/${encodeURIComponent(slug)}/products`,
    params: toParams(query as Record<string, unknown>),
  });
  return { data, meta: requireMeta(meta, query.limit ?? 20) };
}
