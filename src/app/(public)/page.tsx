import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { BannerCarousel } from "@/features/catalog/components/banner-carousel";
import { CategoryGrid } from "@/features/catalog/components/category-grid";
import { HowItWorksStrip } from "@/features/catalog/components/how-it-works-strip";
import { ProductFeed } from "@/features/catalog/components/product-feed";
import { getHomeFeed, getCategories } from "@/features/catalog/server";

const FEED_LIMIT = 12;

function FeedSkeleton() {
  return (
    <section className="grid gap-5">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The 15-minute seed is a time value: both it and the first page come from one
 * `use cache` unit so the shell never evaluates `Date.now()` during prerender.
 */
async function HomeFeedSection() {
  const { seed, page: firstPage } = await getHomeFeed(FEED_LIMIT);
  return <ProductFeed seed={seed} initialPage={firstPage} limit={FEED_LIMIT} />;
}

function HomeSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-6 md:gap-14 md:py-10">
      <Skeleton className="aspect-[4/3] w-full rounded-3xl md:aspect-[3/1]" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
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
  const locale = await getLocale();
  const th = await getTranslations("home");
  const categories = await getCategories();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-6 md:gap-14 md:py-10">
      <BannerCarousel />

      <HowItWorksStrip />

      <section className="grid gap-5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold">{th("shopByCategory")}</h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {th("browseAll")} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <CategoryGrid categories={categories} locale={locale} />
      </section>

      <Suspense fallback={<FeedSkeleton />}>
        <HomeFeedSection />
      </Suspense>
    </div>
  );
}
