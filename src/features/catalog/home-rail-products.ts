/**
 * Home-merchandising rules for product rails. Keep this pure so the server
 * rails and the lazy client rails use exactly the same curation.
 */
export const HOME_RAIL_EXCLUDED_CATEGORY_SLUGS = new Set([
  "seeds",
  "pots-planters",
  "soil-fertilizer",
  "gardening-tools",
]);

export const HOME_RAIL_LIMIT = 8;

/** Below this many unique in-stock plants a rail is hidden instead of padded. */
export const HOME_RAIL_MIN = 4;

export interface HomeRailCandidate {
  id: string;
  inStock: boolean;
  category: { slug: string };
}

export function isHomeRailProduct(product: HomeRailCandidate): boolean {
  if (!product.inStock) return false;
  return !HOME_RAIL_EXCLUDED_CATEGORY_SLUGS.has(product.category.slug);
}

export function curateHomeRailProducts<T extends HomeRailCandidate>(
  pool: readonly T[],
  {
    limit = HOME_RAIL_LIMIT,
    excludeIds = new Set<string>(),
  }: { limit?: number; excludeIds?: ReadonlySet<string> } = {},
): T[] {
  const seen = new Set(excludeIds);
  const selected: T[] = [];

  for (const product of pool) {
    if (selected.length >= limit) break;
    if (seen.has(product.id) || !isHomeRailProduct(product)) continue;
    seen.add(product.id);
    selected.push(product);
  }

  return selected;
}
