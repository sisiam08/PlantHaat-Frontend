export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "popular", "rating"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Enum values accepted by the API (unknown URL values are dropped, not sent). */
export const LIGHT_VALUES = [
  "FULL_SUN",
  "PARTIAL_SHADE",
  "SHADE",
  "BRIGHT_INDIRECT",
  "LOW_LIGHT",
] as const;
export const DIFFICULTY_VALUES = ["EASY", "MODERATE", "HARD"] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ProductQuery {
  q?: string;
  category?: string;
  shop?: string;
  minPrice?: string;
  maxPrice?: string;
  /** Comma-separated `LightRequirement` values. */
  light?: string;
  /** Comma-separated `CareDifficulty` values. */
  difficulty?: string;
  isPetSafe?: boolean;
  inStock?: boolean;
  /** 1–5; only products rated at least this with reviews. */
  minRating?: string;
  onSale?: boolean;
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

/** Filter facet values returned by `GET /products/filter-options`. */
export interface CatalogFilterOptions {
  price: { min: number | null; max: number | null };
  light: string[];
  difficulty: string[];
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/** Splits a comma-joined (or repeated) param into a clean string list. */
export function csvToList(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      seen.add(trimmed);
    }
  }
  return [...seen];
}

/** Joins a string list into a stable comma-separated param value. */
export function listToCsv(values: string[]): string | undefined {
  const unique = [...new Set(values)].filter((value) => value.length > 0).sort();
  return unique.length > 0 ? unique.join(",") : undefined;
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
  // Unknown enum values are ignored so a hand-edited URL never 400s.
  const light = listToCsv(
    csvToList(first(searchParams.light)).filter((value) =>
      (LIGHT_VALUES as readonly string[]).includes(value),
    ),
  );
  if (light) query.light = light;
  const difficulty = listToCsv(
    csvToList(first(searchParams.difficulty)).filter((value) =>
      (DIFFICULTY_VALUES as readonly string[]).includes(value),
    ),
  );
  if (difficulty) query.difficulty = difficulty;
  if (first(searchParams.isPetSafe) === "true") query.isPetSafe = true;
  if (first(searchParams.inStock) === "true") query.inStock = true;
  const minRating = Number(first(searchParams.minRating));
  if (Number.isFinite(minRating) && minRating >= 1 && minRating <= 5) {
    query.minRating = String(Math.trunc(minRating));
  }
  if (first(searchParams.onSale) === "true") query.onSale = true;
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

/**
 * Stable key for a catalog query, shared by the server (first page) and the
 * client (React Query key) so the seeded page and the infinite list agree.
 * `page`/`limit` are cursor-managed and excluded.
 */
export function signatureOf(query: ProductQuery): string {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || key === "limit") {
      continue;
    }
    if (value === undefined || value === false || value === "") {
      continue;
    }
    params[key] = String(value);
  }
  return new URLSearchParams(params).toString();
}

export function productsHref(query: ProductQuery): string {
  const params = queryToSearchParams(query);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
