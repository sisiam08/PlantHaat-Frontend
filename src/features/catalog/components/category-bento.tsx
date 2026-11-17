import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LinkPending } from "@/components/layout/link-pending";
import { PlantImage } from "@/components/plant-image";
import {
  AllCategoriesGlyph,
  CategoryGlyph,
  categorySurfaceClass,
} from "@/features/catalog/category-visual";
import { RailScroller } from "@/features/catalog/components/rail-scroller";
import {
  MAX_CATEGORY_TILES,
  shouldShowAllCategoryTile,
} from "@/features/catalog/category-tiles";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/api/types";

/**
 * All active top-level categories. Mobile/tablet use the shared snap rail with
 * arrow controls; desktop wraps fixed-width tiles and centers every row, so
 * 3/7/11/12 categories never leave a lonely left-aligned orphan. A trailing
 * "All categories" tile fills the common 11-category case.
 */
export async function CategoryBento({
  categories,
  placeholderImageUrls,
}: {
  categories: CategoryNode[];
  placeholderImageUrls: Set<string>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("home");
  if (categories.length === 0) return null;

  const tiles = categories.slice(0, MAX_CATEGORY_TILES);
  const showAllTile = shouldShowAllCategoryTile(categories.length);

  return (
    <RailScroller
      label={t("shopByCategory")}
      controlsClassName="lg:hidden"
      innerClassName={cn(
        "gap-3 lg:mx-0 lg:flex-wrap lg:justify-center lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0",
      )}
    >
      {tiles.map((category) => {
        const name = locale === "bn" && category.nameBn ? category.nameBn : category.name;
        const showImage =
          Boolean(category.imageUrl) && !placeholderImageUrls.has(category.imageUrl ?? "");

        return (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            data-category-tile
            className={cn(
              "group/tile relative flex w-[8.5rem] shrink-0 snap-start flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-3 text-center",
              "shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-lift)]",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "lg:w-[calc((100%-3.75rem)/6)]",
            )}
          >
            <LinkPending className="absolute top-2 right-2 z-20 text-primary" />
            <span
              className={cn(
                "relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl lg:size-[5.5rem] xl:size-24",
                showImage ? "bg-secondary/60" : categorySurfaceClass(category.slug),
              )}
            >
              {showImage ? (
                <PlantImage
                  src={category.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 96px, 88px"
                  className="object-cover transition-transform duration-300 group-hover/tile:scale-[1.03] motion-reduce:transition-none"
                />
              ) : (
                <CategoryGlyph slug={category.slug} className="size-8 lg:size-9" />
              )}
            </span>
            <span className="grid w-full gap-0.5">
              <span className="line-clamp-2 text-sm leading-snug font-semibold">{name}</span>
              {category.productCount > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {t("categoryProductCount", { count: category.productCount })}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}

      {showAllTile ? (
        <Link
          href="/products"
          data-category-all
          className={cn(
            "group/tile relative flex w-[8.5rem] shrink-0 snap-start flex-col items-center gap-2.5 rounded-2xl border border-dashed border-primary/30 bg-secondary/25 p-3 text-center",
            "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/40",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            "lg:w-[calc((100%-3.75rem)/6)]",
          )}
        >
          <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-card/70 lg:size-[5.5rem] xl:size-24">
            <AllCategoriesGlyph className="size-8 lg:size-9" />
          </span>
          <span className="grid w-full gap-0.5">
            <span className="line-clamp-2 text-sm leading-snug font-semibold">
              {t("allCategories")}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{t("browseAll")}</span>
          </span>
        </Link>
      ) : null}
    </RailScroller>
  );
}
