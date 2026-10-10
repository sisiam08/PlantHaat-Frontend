import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Card } from "@/components/ui/card";
import { ProductGrid } from "@/features/catalog/components/product-card";
import { ProductFilters, type FilterOption } from "@/features/catalog/components/product-filters";
import { Pagination } from "@/features/catalog/components/pagination";
import { toProductCardData } from "@/features/catalog/mappers";
import { parseProductQuery, type SearchParams } from "@/features/catalog/query";
import { getCategories, getDistricts, getProducts } from "@/features/catalog/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseProductQuery(sp);
  const locale = await getLocale();
  const t = await getTranslations("catalog");
  const tp = await getTranslations("product");

  const [products, categories, districts] = await Promise.all([
    getProducts(query),
    getCategories(),
    getDistricts(),
  ]);

  const categoryOptions: FilterOption[] = [];
  for (const category of categories) {
    categoryOptions.push({
      value: category.slug,
      label: locale === "bn" && category.nameBn ? category.nameBn : category.name,
    });
    for (const child of category.children) {
      categoryOptions.push({
        value: child.slug,
        label: locale === "bn" && child.nameBn ? child.nameBn : child.name,
      });
    }
  }
  const districtOptions: FilterOption[] = districts.map((district) => ({
    value: String(district.id),
    label: locale === "bn" ? district.nameBn : district.name,
  }));

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <Suspense>
          <ProductFilters categories={categoryOptions} districts={districtOptions} />
        </Suspense>
      </aside>
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("results", { count: products.meta.total })}
          </p>
        </div>
        {products.data.length === 0 ? (
          <Card className="grid place-items-center gap-2 rounded-2xl p-10 text-center">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </Card>
        ) : (
          <ProductGrid
            products={products.data.map(toProductCardData)}
            locale={locale}
            outOfStockLabel={tp("outOfStock")}
          />
        )}
        <Pagination meta={products.meta} query={query} />
      </section>
    </main>
  );
}
