export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "popular", "rating"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ProductQuery {
  q?: string;
  category?: string;
  shop?: string;
  minPrice?: string;
  maxPrice?: string;
  light?: string;
  difficulty?: string;
  isIndoor?: boolean;
  isPetSafe?: boolean;
  inStock?: boolean;
  deliversTo?: number;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

/** Cursor-mode meta of a catalog list page (server first page and client fetches). */
export interface CatalogCursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  /** Present on the first page when the server requested `includeTotal`. */
  total?: number;
}

export interface CatalogPage {
  data: import("@/lib/api/types").ProductListItem[];
  meta: CatalogCursorMeta;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parseProductQuery(searchParams: SearchParams): ProductQuery {
  const query: ProductQuery = {};
  const q = first(searchParams.q);
  if (q) query.q = q;
  const category = first(searchParams.category);
  if (category) query.category = category;
  const shop = first(searchParams.shop);
  if (shop) query.shop = shop;
  const minPrice = first(searchParams.minPrice);
  if (minPrice && Number.isFinite(Number(minPrice))) query.minPrice = minPrice;
  const maxPrice = first(searchParams.maxPrice);
  if (maxPrice && Number.isFinite(Number(maxPrice))) query.maxPrice = maxPrice;
  if (first(searchParams.light)) query.light = first(searchParams.light);
  if (first(searchParams.difficulty)) query.difficulty = first(searchParams.difficulty);
  if (first(searchParams.isIndoor) === "true") query.isIndoor = true;
  if (first(searchParams.isPetSafe) === "true") query.isPetSafe = true;
  if (first(searchParams.inStock) === "true") query.inStock = true;
  const deliversTo = Number(first(searchParams.deliversTo));
  if (Number.isInteger(deliversTo) && deliversTo > 0) query.deliversTo = deliversTo;
  const sort = first(searchParams.sort) as ProductSort | undefined;
  if (sort && PRODUCT_SORTS.includes(sort)) query.sort = sort;
  const page = Number(first(searchParams.page));
  if (Number.isInteger(page) && page > 0) query.page = page;
  return query;
}

export function queryToSearchParams(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

export function productsHref(query: ProductQuery): string {
  const params = queryToSearchParams(query);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
