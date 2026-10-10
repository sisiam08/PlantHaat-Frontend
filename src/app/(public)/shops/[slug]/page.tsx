import { Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProductGrid } from "@/features/catalog/components/product-card";
import { toProductCardData } from "@/features/catalog/mappers";
import { parseProductQuery, type SearchParams } from "@/features/catalog/query";
import { getShop, getShopProducts } from "@/features/catalog/server";
import type { Paginated } from "@/lib/api/common";
import type { ProductListItem, ShopDetail } from "@/lib/api/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shop = await getShop(slug);
    return { title: shop.name, description: shop.description ?? undefined };
  } catch {
    return { title: "Shop" };
  }
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const query = parseProductQuery(sp);
  const locale = await getLocale();
  const t = await getTranslations("shop");
  const tp = await getTranslations("product");

  let shop: ShopDetail;
  let products: Paginated<ProductListItem>;
  try {
    [shop, products] = await Promise.all([getShop(slug), getShopProducts(slug, query)]);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <Card className="overflow-hidden rounded-2xl p-0">
        {shop.bannerUrl ? (
          <div className="relative h-40 w-full md:h-56">
            <Image src={shop.bannerUrl} alt={shop.name} fill priority sizes="100vw" className="object-cover" />
          </div>
        ) : null}
        <div className="flex items-center gap-4 p-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted/40">
            {shop.logoUrl ? (
              <Image src={shop.logoUrl} alt={shop.name} fill sizes="64px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{shop.name}</h1>
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Star aria-hidden className="size-3.5 fill-cta text-cta" />
              {Number(shop.ratingAvg).toFixed(1)} · {shop.ratingCount}
              {shop.district ? ` · ${shop.district}` : ""}
            </p>
          </div>
        </div>
        {shop.description ? (
          <p className="whitespace-pre-wrap px-4 pb-4 text-sm text-muted-foreground">
            {shop.description}
          </p>
        ) : null}
      </Card>

      {shop.isOnVacation ? (
        <Badge variant="secondary" className="w-fit">
          {t("vacation")}
        </Badge>
      ) : null}

      <h2 className="text-lg font-semibold">{t("products")}</h2>
      {products.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
      ) : (
        <ProductGrid
          products={products.data.map(toProductCardData)}
          locale={locale}
          outOfStockLabel={tp("outOfStock")}
        />
      )}
    </main>
  );
}
