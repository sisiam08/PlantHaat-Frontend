"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { HomeSection } from "@/components/layout/home-section";
import { SectionHeader } from "@/components/layout/section-header";
import {
  ProductRail,
  ProductRailSkeleton,
} from "@/features/catalog/components/product-card";
import { fetchListPage } from "@/features/catalog/feed";
import {
  curateHomeRailProducts,
  HOME_RAIL_LIMIT,
} from "@/features/catalog/home-rail-products";
import { toProductCardData } from "@/features/catalog/mappers";
import { productsHref, type ProductQuery } from "@/features/catalog/query";
import { queryKeys } from "@/lib/api/query-keys";

const LIMIT = 24;

const LOW_LIGHT_QUERY: ProductQuery = { light: "LOW_LIGHT", inStock: true };
const PET_SAFE_QUERY: ProductQuery = { isPetSafe: true, inStock: true };

function LazyRailBlock({
  id,
  title,
  query,
  products,
  loading,
  isError,
  retry,
}: {
  id: string;
  title: string;
  query: ProductQuery;
  products: ReturnType<typeof toProductCardData>[];
  loading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  const t = useTranslations("home");
  const tc = useTranslations("catalog");
  const tp = useTranslations("product");
  const locale = useLocale();

  if (!loading && !isError && products.length === 0) return null;

  return (
    <HomeSection labelledBy={id}>
      <div className="grid gap-4" aria-busy={loading}>
        <SectionHeader
          id={id}
          title={title}
          action={{ href: productsHref(query), label: t("seeAll") }}
          actionAriaLabel={`${t("seeAll")}: ${title}`}
        />
        {isError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">{tc("listError")}</p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              {tc("retry")}
            </Button>
          </div>
        ) : loading ? (
          <ProductRailSkeleton count={HOME_RAIL_LIMIT} />
        ) : (
          <ProductRail
            label={title}
            products={products}
            locale={locale}
            outOfStockLabel={tp("outOfStock")}
            actionLabels={{ wishlistAdd: tp("wishlistAdd") }}
            ratingLabels={{
              noReviews: tp("noReviews"),
              aria: tp.raw("ratingAriaLabel") as string,
            }}
          />
        )}
      </div>
    </HomeSection>
  );
}

/** Two extra rails that only fetch when their sentinel approaches the viewport. */
export function LazyRails({ excludeIds = [] }: { excludeIds?: readonly string[] }) {
  const tc = useTranslations("catalog");
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

  const lowLight = useQuery({
    queryKey: queryKeys.catalog.list("rail:lowLight"),
    queryFn: ({ signal }) =>
      fetchListPage(LOW_LIGHT_QUERY as Record<string, unknown>, null, LIMIT, signal),
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });
  const petSafe = useQuery({
    queryKey: queryKeys.catalog.list("rail:petSafe"),
    queryFn: ({ signal }) =>
      fetchListPage(PET_SAFE_QUERY as Record<string, unknown>, null, LIMIT, signal),
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  const alreadyShown = new Set(excludeIds);
  const lowLightProducts = lowLight.data
    ? curateHomeRailProducts(lowLight.data.data, {
        limit: HOME_RAIL_LIMIT,
        excludeIds: alreadyShown,
      })
    : [];
  const petSafeProducts = petSafe.data
    ? curateHomeRailProducts(petSafe.data.data, {
        limit: HOME_RAIL_LIMIT,
        excludeIds: new Set([
          ...alreadyShown,
          ...lowLightProducts.map((product) => product.id),
        ]),
      })
    : [];

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <LazyRailBlock
        id="rail-low-light"
        title={tc("lightOption.LOW_LIGHT")}
        query={LOW_LIGHT_QUERY}
        products={lowLightProducts.map(toProductCardData)}
        loading={!visible || lowLight.isPending}
        isError={lowLight.isError}
        retry={() => void lowLight.refetch()}
      />
      <LazyRailBlock
        id="rail-pet-safe"
        title={tc("petSafe")}
        query={PET_SAFE_QUERY}
        products={petSafeProducts.map(toProductCardData)}
        loading={!visible || petSafe.isPending}
        isError={petSafe.isError}
        retry={() => void petSafe.refetch()}
      />
    </>
  );
}
