import { Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

function ShopSkeleton() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:py-12">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}

async function ShopContent({
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
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:py-12">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        {shop.bannerUrl ? (
          <div className="relative h-40 w-full overflow-hidden bg-muted/40 md:h-56">
            <Image
              src={shop.bannerUrl}
              alt={shop.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-24 w-full bg-gradient-to-br from-primary to-primary/70 md:h-32" />
        )}
        <div className="flex items-center gap-4 p-4 md:p-6">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/40 md:size-20">
            {shop.logoUrl ? (
              <Image
                src={shop.logoUrl}
                alt={shop.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading truncate text-2xl font-bold">{shop.name}</h1>
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Star aria-hidden className="size-3.5 fill-cta text-cta" />
              {Number(shop.ratingAvg).toFixed(1)} · {shop.ratingCount}
              {shop.district ? ` · ${shop.district}` : ""}
            </p>
          </div>
        </div>
        {shop.description ? (
          <p className="px-4 pb-6 text-sm whitespace-pre-wrap text-muted-foreground md:px-6">
            {shop.description}
          </p>
        ) : null}
      </section>

      {shop.isOnVacation ? (
        <Badge variant="secondary" className="w-fit">
          {t("vacation")}
        </Badge>
      ) : null}

      <section className="grid gap-5">
        <h2 className="font-heading text-xl font-semibold">{t("products")}</h2>
        {products.data.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
            {t("noProducts")}
          </div>
        ) : (
          <ProductGrid
            products={products.data.map(toProductCardData)}
            locale={locale}
            outOfStockLabel={tp("outOfStock")}
            actionLabels={{
              wishlistAdd: tp("wishlistAdd"),
            }}
          />
        )}
      </section>
    </main>
  );
}

export default function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

