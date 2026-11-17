"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { toProductCardData } from "@/features/catalog/mappers";
import { fetchFeedPage, type FeedPage } from "@/features/catalog/feed";
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductCardData,
} from "@/features/catalog/components/product-card";
import { queryKeys } from "@/lib/api/query-keys";
import { PRODUCT_GRID_CLASS, PRODUCT_PAGE_SIZE } from "@/features/catalog/components/product-grid";
import { useListScrollRestoration } from "@/features/catalog/components/use-list-scroll-restoration";

function dedupe(pages: FeedPage[] | undefined): ProductCardData[] {
  const seen = new Set<string>();
  const out: ProductCardData[] = [];
  for (const page of pages ?? []) {
    for (const product of page.data) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      out.push(toProductCardData(product));
    }
  }
  return out;
}

export function ProductFeed({
  seed,
  initialPage,
  limit,
}: {
  seed: string;
  initialPage: FeedPage;
  limit: number;
}) {
  const t = useTranslations("home");
  const tp = useTranslations("product");
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.catalog.feed(seed, limit),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchFeedPage(seed, pageParam, limit),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    initialData: { pages: [initialPage], pageParams: [null] },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const products = useMemo(() => dedupe(query.data?.pages), [query.data]);
  const loadedPages = query.data?.pages.length ?? 0;
  const nextCursor = query.data?.pages.at(-1)?.meta.nextCursor ?? null;

  useListScrollRestoration({
    storageKey: "home",
    pages: loadedPages,
    cursor: nextCursor,
    ready: products.length > 0,
  });

  // Infinite scroll sentinel (~600px before the end).
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [query]);

  const showInitialError = query.isError && products.length === 0;

  return (
    <div className="grid gap-5">
      {showInitialError ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("feedError")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : products.length === 0 && !query.isLoading ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("feedEmpty")}</p>
        </div>
      ) : (
        <div data-product-grid className={PRODUCT_GRID_CLASS}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              name={tp("outOfStock")}
              locale={locale}
              actionLabels={{
                wishlistAdd: tp("wishlistAdd"),
              }}
              ratingLabels={{
                noReviews: tp("noReviews"),
                aria: tp.raw("ratingAriaLabel") as string,
              }}
            />
          ))}
          {query.isFetchingNextPage
            ? Array.from({ length: PRODUCT_PAGE_SIZE.feed }).map((_, index) => (
                <ProductCardSkeleton key={`skeleton-${index}`} />
              ))
            : null}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

      {query.isFetchNextPageError ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 p-6 text-center"
        >
          <p className="text-sm text-muted-foreground">{t("feedError")}</p>
          <Button variant="outline" onClick={() => void query.fetchNextPage()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {query.hasNextPage ? (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {t("loadMore")}
            </Button>
          ) : products.length > 0 ? (
            <p className="text-sm text-muted-foreground">{t("feedEnd")}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
