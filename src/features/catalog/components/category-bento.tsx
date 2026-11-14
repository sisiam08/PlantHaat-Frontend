import { Sprout } from "lucide-react";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { LinkPending } from "@/components/layout/link-pending";
import { PlantImage } from "@/components/plant-image";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/api/types";

/**
 * Asymmetric category discovery: two large plates + compact tiles. Clicking a
 * tile keeps the existing category-as-search behaviour.
 */
export async function CategoryBento({ categories }: { categories: CategoryNode[] }) {
  const locale = await getLocale();
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {categories.map((category, index) => {
        const name = locale === "bn" && category.nameBn ? category.nameBn : category.name;
        const large = index < 2;
        return (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className={cn(
              "group/tile relative overflow-hidden rounded-2xl border border-border/60 bg-secondary/60",
              large ? "col-span-2 aspect-[16/10] md:aspect-[16/9]" : "aspect-square md:aspect-[4/3]",
            )}
          >
            <LinkPending className="absolute top-2 right-2 z-20 text-primary" />
            {category.imageUrl ? (
              <PlantImage
                src={category.imageUrl}
                alt=""
                fill
                sizes={large ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
                className="object-cover transition-transform duration-300 group-hover/tile:scale-[1.03] motion-reduce:transition-none"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-primary/40">
                <Sprout aria-hidden className="size-10" strokeWidth={1.25} />
              </span>
            )}
            <span
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/10 to-transparent"
            />
            <span className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-3">
              <span
                className={cn(
                  "font-heading font-semibold text-cream",
                  large ? "text-xl md:text-2xl" : "text-sm md:text-base",
                )}
              >
                {name}
              </span>
              <span className="rounded-full bg-cream/20 px-2 py-0.5 text-[0.7rem] font-medium text-cream">
                {category.productCount}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
