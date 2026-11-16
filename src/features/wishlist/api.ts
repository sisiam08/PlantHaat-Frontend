import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";

export interface WishlistItemView {
  id: string;
  createdAt: string;
  available: boolean;
  product: {
    id: string;
    name: string;
    nameBn: string | null;
    slug: string;
    minPrice: string | null;
    maxPrice: string | null;
    inStock: boolean;
    ratingAvg: string;
    ratingCount: number;
    imageUrl?: string | null;
  };
}

export const wishlistApi = {
  list: (page = 1) =>
    apiGet<WishlistItemView[]>("/wishlist", { params: { page } }).then((result) => ({
      data: result.data,
      meta: result.meta as PaginationMeta | undefined,
    })),
  add: (productId: string) => apiPost<unknown>(`/wishlist/${encodeURIComponent(productId)}`, {}),
  remove: (productId: string) =>
    apiDelete<null>(`/wishlist/${encodeURIComponent(productId)}`).then(() => undefined),
};
