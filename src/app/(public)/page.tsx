import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { HomeSection } from "@/components/layout/home-section";
import { SectionHeader } from "@/components/layout/section-header";
import { SectionFallback } from "@/components/section-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerCarousel } from "@/features/catalog/components/banner-carousel";
import { CategoryBento } from "@/features/catalog/components/category-bento";
import { Hero } from "@/features/catalog/components/hero";
import { HomeRails } from "@/features/catalog/components/home-rails";
import { ProductFeed } from "@/features/catalog/components/product-feed";
import {
  ProductCardSkeleton,
  ProductRailSkeleton,
} from "@/features/catalog/components/product-card";
import { PRODUCT_GRID_CLASS, PRODUCT_PAGE_SIZE } from "@/features/catalog/components/product-grid";
import { getPlaceholderCategoryImageUrls } from "@/features/catalog/category-image.server";
import { getHomeFeed, getCategories, getProducts } from "@/features/catalog/server";
import type { ProductListItem } from "@/lib/api/types";

const FEED_LIMIT = 12;

function RailSectionSkeleton() {
  return (
    <HomeSection>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="h-9 w-40 md:h-10" />
        <ProductRailSkeleton count={8} />
      </div>
    </HomeSection>
  );
}

function FeedSkeleton() {
  return (
    <div data-product-grid className={PRODUCT_GRID_CLASS} aria-hidden>
      {Array.from({ length: PRODUCT_PAGE_SIZE.feed }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

async function HomeFeedSection() {
  let feed: Awaited<ReturnType<typeof getHomeFeed>>;
  try {
    feed = await getHomeFeed(FEED_LIMIT);
  } catch {
    return <SectionFallback />;
  }
  return <ProductFeed seed={feed.seed} initialPage={feed.page} limit={FEED_LIMIT} />;
}

function HomeSkeleton() {
  return (
    <div aria-hidden>
      <HomeSection>
        <div className="grid gap-4">
          <Skeleton className="h-9 w-48 md:h-10" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </HomeSection>
      <RailSectionSkeleton />
      <RailSectionSkeleton />
      <RailSectionSkeleton />
      <RailSectionSkeleton />
      <RailSectionSkeleton />
      <HomeSection>
        <div className="grid gap-4">
          <Skeleton className="h-9 w-40 md:h-10" />
          <Skeleton className="aspect-4/3 w-full rounded-3xl md:aspect-3/1" />
        </div>
      </HomeSection>
      <HomeSection className="pb-8 md:pb-12">
        <div className="grid gap-4">
          <Skeleton className="h-9 w-32 md:h-10" />
          <FeedSkeleton />
        </div>
      </HomeSection>
    </div>
  );
}

export default async function HomePage() {
  let heroCategories: Awaited<ReturnType<typeof getCategories>> | null = null;
  try {
    heroCategories = await getCategories();
  } catch {
    heroCategories = null;
  }
  let heroProducts: ProductListItem[] = [];
  try {
    const popular = await getProducts({ sort: "popular", inStock: true, limit: 3 });
    heroProducts = popular.data;
  } catch {
    heroProducts = [];
  }

  return (
    <>
      <Hero categories={heroCategories ?? []} products={heroProducts} />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </>
  );
}

async function HomeContent() {
  const th = await getTranslations("home");
  let categories: Awaited<ReturnType<typeof getCategories>> | null = null;
  try {
    categories = await getCategories();
  } catch {
    categories = null;
  }
  const safeCategories = categories ?? [];
  const placeholderImageUrls = await getPlaceholderCategoryImageUrls(safeCategories);

  return (
    <>
      <HomeSection labelledBy="home-categories">
        <div className="grid gap-4">
          <SectionHeader
            id="home-categories"
            title={th("shopByCategory")}
            action={{ href: "/products", label: th("browseAllProducts") }}
          />
          {categories ? (
            <CategoryBento
              categories={categories}
              placeholderImageUrls={placeholderImageUrls}
            />
          ) : (
            <SectionFallback />
          )}
        </div>
      </HomeSection>

      <Suspense
        fallback={
          <>
            <RailSectionSkeleton />
            <RailSectionSkeleton />
            <RailSectionSkeleton />
          </>
        }
      >
        <HomeRails />
      </Suspense>

      <HomeSection labelledBy="home-highlights">
        <div className="grid gap-4">
          <SectionHeader id="home-highlights" title={th("bannerLabel")} />
          <BannerCarousel />
        </div>
      </HomeSection>

      <HomeSection labelledBy="home-all-plants" className="pb-8 md:pb-12">
        <div className="grid gap-4">
          <SectionHeader
            id="home-all-plants"
            title={th("allProducts")}
            subtitle={th("allProductsSubtitle")}
          />
          <Suspense fallback={<FeedSkeleton />}>
            <HomeFeedSection />
          </Suspense>
        </div>
      </HomeSection>
    </>
  );
}
