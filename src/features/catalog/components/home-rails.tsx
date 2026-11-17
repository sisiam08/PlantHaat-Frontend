import { getLocale, getTranslations } from "next-intl/server";

import { HomeSection } from "@/components/layout/home-section";
import { SectionHeader } from "@/components/layout/section-header";
import { LazyRails } from "@/features/catalog/components/lazy-rails";
import { ProductRail } from "@/features/catalog/components/product-card";
import {
  curateHomeRailProducts,
  HOME_RAIL_LIMIT,
  HOME_RAIL_MIN,
} from "@/features/catalog/home-rail-products";
import { toProductCardData } from "@/features/catalog/mappers";
import { productsHref, type ProductQuery } from "@/features/catalog/query";
import { getProductsCursorPage } from "@/features/catalog/server";

/**
 * Fetch enough candidates for three genuinely complementary plant rails. The
 * backend currently returns the same order for `popular` and `newest`, so a
 * small page would leave New arrivals empty after deduplication.
 */
const RAIL_FETCH_LIMIT = 50;

const RAILS: { key: "trending" | "newArrivals" | "under500"; query: ProductQuery }[] = [
  { key: "trending", query: { sort: "popular", inStock: true } },
  { key: "newArrivals", query: { sort: "newest", inStock: true } },
  { key: "under500", query: { maxPrice: "500", sort: "popular", inStock: true } },
];

/**
 * First-paint rails. Each rail is curated (plants only, in stock) and excludes
 * product ids already shown by the previous rail, so Trending / New arrivals /
 * Under ৳500 are distinct. The two lazy rails follow below.
 */
export async function HomeRails() {
  const t = await getTranslations("home");
  const tp = await getTranslations("product");
  const locale = await getLocale();
  const pools = await Promise.all(
    RAILS.map(async (rail) => {
      try {
        return await getProductsCursorPage(rail.query, RAIL_FETCH_LIMIT);
      } catch {
        return null;
      }
    }),
  );

  const used = new Set<string>();
  const rails = RAILS.map((rail, index) => {
    const pool = pools[index];
    if (!pool) return { ...rail, products: [], title: t(rail.key) };
    const products = curateHomeRailProducts(pool.data, {
      excludeIds: used,
      limit: HOME_RAIL_LIMIT,
    });
    products.forEach((product) => used.add(product.id));
    return { ...rail, products, title: t(rail.key) };
  });

  if (rails.every((rail) => rail.products.length < HOME_RAIL_MIN)) {
    return null;
  }

  return (
    <>
      {rails.map((rail) => {
        if (rail.products.length < HOME_RAIL_MIN) return null;
        return (
          <HomeSection key={rail.key} labelledBy={`rail-${rail.key}`}>
            <div className="grid gap-4">
              <SectionHeader
                id={`rail-${rail.key}`}
                title={rail.title}
                action={{
                  href: productsHref(rail.query),
                  label: t("seeAll"),
                }}
                actionAriaLabel={`${t("seeAll")}: ${rail.title}`}
              />
              <ProductRail
                label={rail.title}
                products={rail.products.map(toProductCardData)}
                locale={locale}
                outOfStockLabel={tp("outOfStock")}
                actionLabels={{
                  wishlistAdd: tp("wishlistAdd"),
                }}
                ratingLabels={{
                  noReviews: tp("noReviews"),
                  aria: tp.raw("ratingAriaLabel") as string,
                }}
              />
            </div>
          </HomeSection>
        );
      })}
      <LazyRails excludeIds={[...used]} />
    </>
  );
}
