import { Leaf } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LinkPending } from "@/components/layout/link-pending";
import type { CategoryNode } from "@/lib/api/types";

/**
 * Active top-level categories (children are reachable through the products-page
 * filters). Clicking a tile behaves like a search for the category name: it
 * lands on `/products?category=<slug>`.
 */
export function CategoryGrid({
  categories,
  locale,
}: {
  categories: CategoryNode[];
  locale: string;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
      {categories.map((category) => {
        const name = locale === "bn" && category.nameBn ? category.nameBn : category.name;
        return (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className="group/tile flex w-28 shrink-0 snap-start flex-col items-center gap-2 text-center md:w-auto"
          >
            <span className="relative grid size-24 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-secondary/50 ring-1 ring-border/40 transition-all group-hover/tile:-translate-y-0.5 group-hover/tile:border-primary/40 group-hover/tile:shadow-md motion-reduce:group-hover/tile:translate-y-0 lg:size-28">
              <LinkPending className="absolute top-2 right-2 z-10 text-primary" />
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 112px, 128px"
                  className="object-cover transition-transform duration-300 group-hover/tile:scale-105 motion-reduce:transition-none"
                />
              ) : (
                <Leaf aria-hidden className="size-8 text-primary" />
              )}
            </span>
            <span className="line-clamp-2 text-sm leading-snug font-medium">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}
