import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SectionFallback } from "@/components/section-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerCarousel } from "@/features/catalog/components/banner-carousel";
import { CategoryBento } from "@/features/catalog/components/category-bento";
import { Hero } from "@/features/catalog/components/hero";
import { HomeRails } from "@/features/catalog/components/home-rails";
import { LazyRails } from "@/features/catalog/components/lazy-rails";
import { ProductFeed } from "@/features/catalog/components/product-feed";
import { TrustStrip } from "@/features/catalog/components/trust-strip";
import { getHomeFeed, getCategories } from "@/features/catalog/server";

const FEED_LIMIT = 12;

function RailSkeleton() {
  return (
    <section className="grid gap-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="aspect-4/5 w-full rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <section className="grid gap-5">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="aspect-4/5 w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </section>
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
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 md:gap-12 md:py-10">
      <Skeleton className="aspect-4/3 w-full rounded-[2rem] md:aspect-[16/7]" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
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

  return (
    <>
      <Hero categories={safeCategories} />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 md:gap-12 md:py-10">
        <TrustStrip />

      <section aria-labelledby="home-categories" className="grid gap-5">
        <div className="flex items-end justify-between gap-4">
          <h2 id="home-categories" className="font-heading text-2xl font-semibold">
            {th("shopByCategory")}
          </h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {th("browseAll")} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        {categories ? (
          <CategoryBento categories={categories} />
        ) : (
          <SectionFallback />
        )}
      </section>

      <Suspense
        fallback={
          <div className="grid gap-10">
            <RailSkeleton />
            <RailSkeleton />
            <RailSkeleton />
          </div>
        }
      >
        <HomeRails />
      </Suspense>

      <LazyRails />

      <section aria-labelledby="home-offers" className="grid gap-4">
        <h2 id="home-offers" className="font-heading text-2xl font-semibold md:text-3xl">
          {th("offers")}
        </h2>
        <BannerCarousel />
      </section>

      <Suspense fallback={<FeedSkeleton />}>
        <HomeFeedSection />
      </Suspense>
      </div>
    </>
  );
}




