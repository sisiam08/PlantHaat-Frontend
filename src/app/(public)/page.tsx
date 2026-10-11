import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { BannerCarousel } from "@/features/catalog/components/banner-carousel";
import { CategoryGrid } from "@/features/catalog/components/category-grid";
import { HowItWorksStrip } from "@/features/catalog/components/how-it-works-strip";
import { ProductFeed } from "@/features/catalog/components/product-feed";
import { currentFeedSeed, getCategories, getProductFeedPage } from "@/features/catalog/server";

const FEED_LIMIT = 12;

export default async function HomePage() {
  const locale = await getLocale();
  const th = await getTranslations("home");

  // Same order for every visitor in the same 15-minute window (cacheable first
  // page); the client keeps this seed for the whole session.
  const seed = currentFeedSeed();

  const [categories, firstPage] = await Promise.all([
    getCategories(),
    getProductFeedPage(seed, FEED_LIMIT),
  ]);

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

      <ProductFeed seed={seed} initialPage={firstPage} limit={FEED_LIMIT} />
    </div>
  );
}
