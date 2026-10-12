import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatPriceRange } from "@/lib/format/money";

export function StarRating({
  value,
  count,
  className,
}: {
  value: string | number | null | undefined;
  count?: number;
  className?: string;
}) {
  const numeric = Number(value ?? 0);
  const rounded = Math.round(numeric);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden
          className={cn(
            "size-3.5",
            index <= rounded ? "fill-cta text-cta" : "text-muted-foreground/30",
          )}
        />
      ))}
      <span className="sr-only">{numeric.toFixed(1)} / 5</span>
      {typeof count === "number" ? (
        <span className="ml-1 text-xs text-muted-foreground">({count})</span>
      ) : null}
    </span>
  );
}

export interface ProductCardData {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  minPrice?: string | null;
  maxPrice?: string | null;
  inStock: boolean;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
  imageUrl?: string | null;
  shopName?: string | null;
}

export function ProductCard({
  product,
  name,
  locale,
}: {
  product: ProductCardData;
  name: string;
  locale: string;
}) {
  return (
    <div className="group/card relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={`/products/${product.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/40 ring-1 ring-border/40">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover/card:scale-105 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
            />
          ) : null}
          {!product.inStock ? (
            <div className="absolute inset-0 grid place-items-center bg-background/55">
              <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm">
                {name}
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid flex-1 content-start gap-1.5 p-3">
          <p className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</p>
          {product.nameBn ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{product.nameBn}</p>
          ) : null}
          <p className="font-heading text-base font-semibold text-primary">
            {formatPriceRange(product.minPrice, product.maxPrice, locale)}
          </p>
          <div className="flex items-center justify-between gap-2">
            <StarRating value={product.ratingAvg} count={product.ratingCount ?? 0} />
          </div>
          {product.shopName ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{product.shopName}</p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

export function ProductGrid({
  products,
  locale,
  outOfStockLabel,
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          name={outOfStockLabel}
          locale={locale}
        />
      ))}
    </div>
  );
}

export function ProductRail({
  products,
  locale,
  outOfStockLabel,
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
}) {
  return (
    <div className="-mx-4 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
      {products.map((product) => (
        <div
          key={product.id}
          className="w-40 shrink-0 snap-start sm:w-48 md:w-auto"
        >
          <ProductCard product={product} name={outOfStockLabel} locale={locale} />
        </div>
      ))}
    </div>
  );
}
