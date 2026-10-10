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
import type { ProductQuery } from "./query";

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

export async function getProduct(slug: string): Promise<ProductDetail> {
  "use cache";
  cacheTag(CACHE_TAGS.products, productTag(slug), productReviewsTag(slug));
  cacheLife("minutes");
  const { data } = await serverRequest<ProductDetail>({
    method: "GET",
    url: `/products/${encodeURIComponent(slug)}`,
  });
  return data;
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
