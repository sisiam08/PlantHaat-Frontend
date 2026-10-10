import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const t = await getTranslations("shop");
  const shops = await getShops(page);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {shops.data.length === 0 ? (
        <Card className="rounded-2xl p-10 text-center text-muted-foreground">{t("noProducts")}</Card>
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
            <Button asChild variant="outline">
              <Link href={`/shops?page=${page - 1}`}>‹</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            {shops.meta.page} / {shops.meta.totalPages}
          </span>
          {page < shops.meta.totalPages ? (
            <Button asChild variant="outline">
              <Link href={`/shops?page=${page + 1}`}>›</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
