"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { toProductCardData } from "@/features/catalog/mappers";
import { fetchFeedPage, type FeedPage } from "@/features/catalog/feed";
import { ProductCard, ProductCardSkeleton, type ProductCardData } from "@/features/catalog/components/product-card";
import { queryKeys } from "@/lib/api/query-keys";

const SCROLL_KEY_PREFIX = "ph_feed_scroll_";
const SEED_KEY = "ph_feed_seed";

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

  // Keep the seed for the whole session (diagnostics + scroll key).
  useEffect(() => {
    try {
      sessionStorage.setItem(SEED_KEY, seed);
    } catch {
      // storage may be unavailable (private mode); non-fatal
    }
  }, [seed]);

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

  // Restore / persist scroll position keyed by the feed seed.
  useEffect(() => {
    const key = `${SCROLL_KEY_PREFIX}${seed}`;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(key);
    } catch {
      saved = null;
    }
    if (saved) {
      window.scrollTo({ top: Number(saved), behavior: "auto" });
    }
    const onScroll = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        // ignore
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [seed]);

  const showInitialError = query.isError && products.length === 0;

  return (
    <section className="grid gap-5">
      <h2 className="font-heading text-2xl font-semibold">{t("allPlants")}</h2>

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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              name={tp("outOfStock")}
              locale={locale}
            />
          ))}
          {query.isFetchingNextPage
            ? Array.from({ length: limit > 12 ? 5 : 4 }).map((_, index) => (
                <ProductCardSkeleton key={`skeleton-${index}`} />
              ))
            : null}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

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
    </section>
  );
}
