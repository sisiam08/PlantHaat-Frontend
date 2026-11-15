export const CACHE_TAGS = {
  home: "home",
  banners: "banners",
  categories: "categories",
  products: "products",
  shops: "shops",
  settings: "settings",
} as const;

export function productTag(slug: string): string {
  return `product:${slug}`;
}

export function shopTag(slug: string): string {
  return `shop:${slug}`;
}

export function productReviewsTag(slug: string): string {
  return `product-reviews:${slug}`;
}

interface MutationTagRule {
  test: RegExp;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  tags: string[];
}

/**
 * Maps a successful gateway mutation (path + method) to the cache tags that
 * should be invalidated. Backend-originated changes rely on time-based expiry.
 */
const MUTATION_TAG_RULES: MutationTagRule[] = [
  {
    test: /^\/seller\/products(\/|$)|^\/seller\/variants\//,
    method: "POST",
    tags: [CACHE_TAGS.products],
  },
  { test: /^\/seller\/products\//, method: "PATCH", tags: [CACHE_TAGS.products] },
  { test: /^\/seller\/products\//, method: "DELETE", tags: [CACHE_TAGS.products] },
  { test: /^\/admin\/products\//, method: "POST", tags: [CACHE_TAGS.products] },
  { test: /^\/admin\/categories/, method: "POST", tags: [CACHE_TAGS.categories, CACHE_TAGS.products] },
  {
    test: /^\/admin\/categories\//,
    method: "PATCH",
    tags: [CACHE_TAGS.categories, CACHE_TAGS.products],
  },
  {
    test: /^\/admin\/categories\//,
    method: "DELETE",
    tags: [CACHE_TAGS.categories, CACHE_TAGS.products],
  },
  { test: /^\/admin\/banners/, method: "POST", tags: [CACHE_TAGS.home, CACHE_TAGS.banners] },
  {
    test: /^\/admin\/banners\//,
    method: "PATCH",
    tags: [CACHE_TAGS.home, CACHE_TAGS.banners],
  },
  {
    test: /^\/admin\/banners\//,
    method: "DELETE",
    tags: [CACHE_TAGS.home, CACHE_TAGS.banners],
  },
  {
    test: /^\/admin\/homepage-sections/,
    method: "POST",
    tags: [CACHE_TAGS.home, CACHE_TAGS.banners],
  },
  {
    test: /^\/admin\/homepage-sections\//,
    method: "PATCH",
    tags: [CACHE_TAGS.home, CACHE_TAGS.banners],
  },
  {
    test: /^\/admin\/homepage-sections\//,
    method: "DELETE",
    tags: [CACHE_TAGS.home, CACHE_TAGS.banners],
  },
  { test: /^\/admin\/settings$/, method: "PATCH", tags: [CACHE_TAGS.settings] },
  { test: /^\/seller\/shop/, method: "PATCH", tags: [CACHE_TAGS.shops] },
  { test: /^\/seller\/shop\//, method: "POST", tags: [CACHE_TAGS.shops] },
  { test: /^\/seller\/delivery-zones/, method: "POST", tags: [CACHE_TAGS.shops] },
  { test: /^\/seller\/delivery-zones\//, method: "PATCH", tags: [CACHE_TAGS.shops] },
  { test: /^\/seller\/delivery-zones\//, method: "DELETE", tags: [CACHE_TAGS.shops] },
];

export function tagsForMutation(path: string, method: string): string[] {
  const tags = new Set<string>();
  for (const rule of MUTATION_TAG_RULES) {
    if (rule.method === method && rule.test.test(path)) {
      for (const tag of rule.tags) {
        tags.add(tag);
      }
    }
  }
  return [...tags];
}
