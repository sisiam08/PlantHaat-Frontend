import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopCard } from "@/features/catalog/components/shop-card";
import { getShops } from "@/features/catalog/server";
import type { SearchParams } from "@/features/catalog/query";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("title") };
}

function readPage(searchParams: SearchParams): number {
  const raw = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function ShopsSkeleton() {
  return (
    <PageContainer className="gap-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </PageContainer>
  );
}

async function ShopsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const t = await getTranslations("shop");
  const tc = await getTranslations("catalog");
  const shops = await getShops(page);

  return (
    <PageContainer className="gap-8">
      <PageHeader title={t("title")} className="border-b border-border/60 pb-4" />
      {shops.data.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
          {t("noProducts")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.data.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
      {shops.meta.totalPages > 1 ? (
        <nav className="flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" className="min-h-11 min-w-11 px-0">
              <Link href={`/shops?page=${page - 1}`} aria-label={tc("prev")}>
                ‹
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            {shops.meta.page} / {shops.meta.totalPages}
          </span>
          {page < shops.meta.totalPages ? (
            <Button asChild variant="outline" className="min-h-11 min-w-11 px-0">
              <Link href={`/shops?page=${page + 1}`} aria-label={tc("next")}>
                ›
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageContainer>
  );
}

export default function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<ShopsSkeleton />}>
      <ShopsContent searchParams={searchParams} />
    </Suspense>
  );
}
