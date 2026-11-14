import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { ProductRail } from "@/features/catalog/components/product-card";
import { toProductCardData } from "@/features/catalog/mappers";
import { productsHref, type ProductQuery } from "@/features/catalog/query";
import { getProductsCursorPage } from "@/features/catalog/server";

const RAIL_LIMIT = 8;

const RAILS: { key: "trending" | "newArrivals" | "under500"; query: ProductQuery }[] = [
  { key: "trending", query: { sort: "popular", inStock: true } },
  { key: "newArrivals", query: { sort: "newest", inStock: true } },
  { key: "under500", query: { maxPrice: "500", sort: "popular" } },
];

/**
 * First paint owns three rails (the three most useful queries). The remaining
 * two mount lazily below the fold (see LazyRails).
 */
export async function HomeRails() {
  const t = await getTranslations("home");
  const tp = await getTranslations("product");
  const locale = await getLocale();
  const pages = await Promise.all(
    RAILS.map(async (rail) => {
      try {
        return await getProductsCursorPage(rail.query, RAIL_LIMIT);
      } catch {
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  for (const page of pages) {
    if (!page) continue;
    page.data = page.data.filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }

  return (
    <div className="grid gap-10">
      {RAILS.map((rail, index) => {
        const page = pages[index];
        if (!page || page.data.length === 0) {
          return null;
        }
        return (
          <section key={rail.key} aria-labelledby={`rail-${rail.key}`} className="grid gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2
                id={`rail-${rail.key}`}
                className="font-heading text-2xl font-semibold md:text-3xl"
              >
                {t(rail.key)}
              </h2>
              <Link
                href={productsHref(rail.query)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("seeAll")}
              </Link>
            </div>
            <ProductRail
              products={page.data.map(toProductCardData)}
              locale={locale}
              outOfStockLabel={tp("outOfStock")}
              actionLabels={{
                wishlistAdd: tp("wishlistAdd"),
                quickAdd: tp("quickAdd"),
              }}
            />
          </section>
        );
      })}
    </div>
  );
}

