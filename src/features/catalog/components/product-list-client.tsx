"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListPage } from "@/features/catalog/feed";
import { ProductCard, type ProductCardData } from "@/features/catalog/components/product-card";
import { toProductCardData } from "@/features/catalog/mappers";
import { type ProductQuery, type CatalogPage } from "@/features/catalog/query";
import { DidYouMean } from "@/features/search/did-you-mean";
import { queryKeys } from "@/lib/api/query-keys";

const SCROLL_KEY_PREFIX = "ph_list_scroll_";

/** De-duplicates accumulated pages by product id. */
function dedupe(pages: CatalogPage[] | undefined): ProductCardData[] {
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

export function ProductListClient({
  query,
  initialPage,
  limit,
  categoryName,
}: {
  /** The filter/sort combination of the server-rendered first page. */
  query: ProductQuery;
  initialPage: CatalogPage;
  limit: number;
  /** Server-resolved display name of the current category filter. */
  categoryName?: string;
}) {
  const t = useTranslations("catalog");
  const tp = useTranslations("product");
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Canonical signature of the filters/sort in the URL: the queryKey and the
  // scroll-restore key. Changing any filter resets pages and scrolls to top.
  const signature = useMemo(() => new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== false && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString(), [query]);

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.catalog.list(signature),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchListPage(
        query as unknown as Record<string, unknown>,
        pageParam as string | null,
        limit,
      ),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    initialData: { pages: [initialPage], pageParams: [null] },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const products = useMemo(() => dedupe(listQuery.data?.pages), [listQuery.data]);

  // Restore the scroll position accumulated for this exact filter combination
  // (session-scoped, same mechanism as the home feed). Everything else scrolls
  // to the top so a filter change always reads like a fresh list.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${signature}`);
    } catch {
      saved = null;
    }
    if (saved && Number(saved) > 0) {
      window.scrollTo({ top: Number(saved), behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [signature]);

  // Persist the scroll position for the current combination.
  useEffect(() => {
    const onScroll = () => {
      try {
        sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${signature}`, String(window.scrollY));
      } catch {
        // ignore (private mode)
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [signature]);

  // Infinite scroll sentinel (~600px before the end of the list).
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
          void listQuery.fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [listQuery]);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 1600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const totalFromApi = listQuery.data?.pages
    .map((page) => page.meta.total)
    .find((value) => typeof value === "number");
  const showInitialError = listQuery.isError && products.length === 0;

  return (
    <section className="grid content-start gap-6">
      <header className="grid gap-1 border-b border-border/60 pb-4">
        <h1 className="font-heading text-3xl font-bold">{categoryName ?? t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {totalFromApi !== undefined ? t("results", { count: totalFromApi }) : null}
        </p>
      </header>

      {products.length === 0 && !listQuery.isLoading ? (
        showInitialError ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t("listError")}</p>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              {t("retry")}
            </Button>
          </div>
        ) : (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
            {typeof query.q === "string" && query.q ? <DidYouMean query={query.q} /> : null}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                name={tp("outOfStock")}
                locale={locale}
              />
            ))}
            {listQuery.isFetchingNextPage
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="grid gap-2">
                    <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              : null}
          </div>

          <div className="flex flex-col items-center gap-2">
            {listQuery.isError && products.length > 0 ? (
              <Button variant="outline" onClick={() => void listQuery.refetch()}>
                {t("retry")}
              </Button>
            ) : null}
            {listQuery.hasNextPage ? (
              <Button
                variant="outline"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {t("loadMore")}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("listEnd")}</p>
            )}
          </div>
        </>
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t("backToTop")}
          className="fixed bottom-20 right-4 z-40 grid size-11 place-items-center rounded-full border border-border/60 bg-card/95 text-foreground shadow-md backdrop-blur-md md:bottom-6"
        >
          <ArrowUp aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
