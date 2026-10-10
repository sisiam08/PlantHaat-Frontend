import type { MetadataRoute } from "next";

import { clientEnv } from "@/env/client";
import { getCategories, getProducts, getShops } from "@/features/catalog/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/shops`, changeFrequency: "weekly", priority: 0.7 },
  ];

  try {
    const [products, shops, categories] = await Promise.all([
      getProducts({ limit: 50 }),
      getShops(1),
      getCategories(),
    ]);
    for (const product of products.data) {
      entries.push({ url: `${base}/products/${product.slug}`, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const shop of shops.data) {
      entries.push({ url: `${base}/shops/${shop.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const category of categories) {
      entries.push({ url: `${base}/products?category=${category.slug}`, changeFrequency: "weekly", priority: 0.5 });
    }
  } catch {
    // Backend unavailable at build time — keep the static entries.
  }

  return entries;
}
