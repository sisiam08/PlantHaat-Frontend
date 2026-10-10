import type { ProductListItem } from "@/lib/api/types";
import type { ProductCardData } from "./components/product-card";

export function toProductCardData(product: ProductListItem): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    nameBn: product.nameBn,
    slug: product.slug,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    inStock: product.inStock,
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    imageUrl: product.image?.url ?? null,
    shopName: product.shop?.name ?? null,
  };
}
