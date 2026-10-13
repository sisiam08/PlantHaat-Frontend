import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterChips,
  ProductFilters,
  ProductFiltersDrawer,
  type FilterOption,
} from "@/features/catalog/components/product-filters";
import { ProductListClient } from "@/features/catalog/components/product-list-client";
import { parseProductQuery, type SearchParams } from "@/features/catalog/query";
import {
  getCategories,
  getDistricts,
  getProductsCursorPage,
} from "@/features/catalog/server";

const LIST_LIMIT = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  return { title: t("title"), description: t("subtitle") };
}

function ListSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <Skeleton className="h-96 w-full rounded-2xl" />
      <div className="grid content-start gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function ProductsSection({ sp }: { sp: SearchParams }) {
  const query = parseProductQuery(sp);
  const locale = await getLocale();

  const [firstPage, categories, districts] = await Promise.all([
    getProductsCursorPage(query, LIST_LIMIT),
    getCategories(),
    getDistricts(),
  ]);

  const categoryOptions: FilterOption[] = [];
  let categoryName: string | undefined;
  for (const category of categories) {
    const parentLabel = locale === "bn" && category.nameBn ? category.nameBn : category.name;
    categoryOptions.push({ value: category.slug, label: parentLabel });
    if (query.category === category.slug) {
      categoryName = parentLabel;
    }
    for (const child of category.children) {
      const childLabel = locale === "bn" && child.nameBn ? child.nameBn : child.name;
      categoryOptions.push({ value: child.slug, label: childLabel });
      if (query.category === child.slug) {
        categoryName = childLabel;
      }
    }
  }
  const districtOptions: FilterOption[] = districts.map((district) => ({
    value: String(district.id),
    label: locale === "bn" ? district.nameBn : district.name,
  }));

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <ProductFilters
          categories={categoryOptions}
          districts={districtOptions}
          categoryName={categoryName}
        />
      </aside>
      <section className="grid content-start gap-6">
        <ProductFiltersDrawer
          categories={categoryOptions}
          districts={districtOptions}
          categoryName={categoryName}
        />
        <FilterChips categories={categoryOptions} districts={districtOptions} />
        <ProductListClient
          query={query}
          initialPage={firstPage}
          limit={LIST_LIMIT}
          categoryName={categoryName}
        />
      </section>
    </main>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProductsSection sp={sp} />
    </Suspense>
  );
}
