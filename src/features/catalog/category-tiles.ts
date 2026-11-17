export const MAX_CATEGORY_TILES = 12;

/**
 * The desktop row is six tiles wide. Add the "All categories" tile only when
 * it improves the final row; for 3/7/11 it fills or balances it, for 6/12 it
 * would create a new row.
 */
export function shouldShowAllCategoryTile(count: number): boolean {
  return count > 0 && count < MAX_CATEGORY_TILES && count % 6 !== 0;
}

export function categoryTileCount(count: number): number {
  return Math.min(Math.max(count, 0), MAX_CATEGORY_TILES) + (shouldShowAllCategoryTile(count) ? 1 : 0);
}
