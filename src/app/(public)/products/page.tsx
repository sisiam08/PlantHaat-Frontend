import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_GRID_CLASS, PRODUCT_PAGE_SIZE } from "@/features/catalog/components/product-grid";
import {
  ProductsBrowser,
  type CategoryFilterOption,
} from "@/features/catalog/components/products-browser";
import { parseProductQuery, signatureOf, type SearchParams } from "@/features/catalog/query";
import { getCategories, getProductsCursorPage } from "@/features/catalog/server";

const LIST_LIMIT = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  return { title: t("title"), description: t("subtitle") };
}

function ListSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <Skeleton className="hidden h-96 w-full rounded-2xl lg:block" />
      <div className="grid content-start gap-6">
        <Skeleton className="h-24 w-full" />
        <div data-product-grid className={PRODUCT_GRID_CLASS}>
          {Array.from({ length: PRODUCT_PAGE_SIZE.catalog }).map((_, index) => (
            <Skeleton
              data-product-skeleton
              key={index}
              className="aspect-[4/5] w-full rounded-2xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

async function ProductsSection({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const categories = await getCategories();
  const query = parseProductQuery(params);

  // Cached, server-rendered first page (seeds the infinite list).
  const initialPage = await getProductsCursorPage(query, LIST_LIMIT);

  const options: CategoryFilterOption[] = categories.map((category) => ({
    value: category.slug,
    label: locale === "bn" && category.nameBn ? category.nameBn : category.name,
    children: category.children.map((child) => ({
      value: child.slug,
      label: locale === "bn" && child.nameBn ? child.nameBn : child.name,
    })),
  }));

  return (
    <ProductsBrowser
      categories={options}
      locale={locale}
      initialPage={initialPage}
      initialSignature={signatureOf(query)}
    />
  );
}

export default function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProductsSection searchParams={searchParams} />
    </Suspense>
  );
}
