import { ArrowRight, Sprout } from "lucide-react";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { LinkPending } from "@/components/layout/link-pending";
import { PlantImage } from "@/components/plant-image";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/api/types";

const MAX_TILES = 6;

/**
 * Compact discovery: a horizontal snap rail on mobile and a complete 2+4 bento
 * on desktop (no orphan tile). Labels sit on a solid surface, never on busy art.
 */
export async function CategoryBento({ categories }: { categories: CategoryNode[] }) {
  const locale = await getLocale();
  if (categories.length === 0) return null;
  const tiles = categories.slice(0, MAX_TILES);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
      {tiles.map((category, index) => {
        const name = locale === "bn" && category.nameBn ? category.nameBn : category.name;
        const large = index < 2;
        return (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className={cn(
              "group/tile relative flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card",
              large ? "w-40 md:col-span-2 md:w-auto" : "w-24 md:w-auto",
            )}
          >
            <LinkPending className="absolute top-2 right-2 z-20 text-primary" />
            <span
              className={cn(
                "relative block w-full overflow-hidden bg-secondary/60",
                large ? "aspect-[16/10]" : "aspect-[4/3]",
              )}
            >
              {category.imageUrl ? (
                <PlantImage
                  src={category.imageUrl}
                  alt=""
                  fill
                  sizes={large ? "(max-width: 768px) 160px, 50vw" : "96px"}
                  className="object-cover transition-transform duration-300 group-hover/tile:scale-[1.03] motion-reduce:transition-none"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-primary/50">
                  <Sprout aria-hidden className={large ? "size-8" : "size-5"} strokeWidth={1.5} />
                </span>
              )}
            </span>
            <span
              className={cn(
                "flex items-center justify-between gap-1 bg-card px-2.5 py-2 text-foreground",
                large ? "text-sm font-semibold" : "text-[0.7rem] font-medium",
              )}
            >
              <span className="line-clamp-2 leading-snug">{name}</span>
              <ArrowRight aria-hidden className="size-3 shrink-0 text-muted-foreground" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}


