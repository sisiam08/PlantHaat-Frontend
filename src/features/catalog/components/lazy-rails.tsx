"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductRail } from "@/features/catalog/components/product-card";
import { fetchListPage } from "@/features/catalog/feed";
import { toProductCardData } from "@/features/catalog/mappers";
import { productsHref, type ProductQuery } from "@/features/catalog/query";
import { queryKeys } from "@/lib/api/query-keys";

const LIMIT = 8;

const LAZY_RAILS: { key: "lowLight" | "petSafe"; query: ProductQuery }[] = [
  { key: "lowLight", query: { light: "LOW_LIGHT" } },
  { key: "petSafe", query: { isPetSafe: true } },
];

function LazyRail({ railKey, query }: { railKey: "lowLight" | "petSafe"; query: ProductQuery }) {
  const t = useTranslations("home");
  const tCatalog = useTranslations("catalog");
  const tp = useTranslations("product");
  const locale = useLocale();

  const list = useQuery({
    queryKey: queryKeys.catalog.list(`rail:${railKey}`),
    queryFn: ({ signal }) =>
      fetchListPage(query as Record<string, unknown>, null, LIMIT, signal),
    staleTime: 5 * 60 * 1000,
  });

  if (list.isError) {
    return (
      <section className="grid gap-3">
        <h2 className="font-heading text-2xl font-semibold">
          {railKey === "lowLight" ? tCatalog("lightOption.LOW_LIGHT") : tCatalog("petSafe")}
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{tCatalog("listError")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void list.refetch()}>
            {tCatalog("retry")}
          </Button>
        </div>
      </section>
    );
  }

  if (!list.data || list.data.data.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          {railKey === "lowLight" ? tCatalog("lightOption.LOW_LIGHT") : tCatalog("petSafe")}
        </h2>
        <Link
          href={productsHref(query)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("seeAll")}
        </Link>
      </div>
      <ProductRail
        products={list.data.data.map(toProductCardData)}
        locale={locale}
        outOfStockLabel={tp("outOfStock")}
        actionLabels={{
          wishlistAdd: tp("wishlistAdd"),
          quickAdd: tp("quickAdd"),
        }}
      />
    </section>
  );
}

/** Two extra rails that only fetch when their sentinel approaches the viewport. */
export function LazyRails() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinel} className="grid gap-10">
      {visible ? (
        LAZY_RAILS.map((rail) => (
          <LazyRail key={rail.key} railKey={rail.key} query={rail.query} />
        ))
      ) : (
        <div aria-hidden className="h-16" />
      )}
    </div>
  );
}


