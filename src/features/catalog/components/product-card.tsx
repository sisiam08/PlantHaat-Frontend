import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <Card className="group overflow-hidden rounded-2xl p-0 transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : null}
          {!product.inStock ? (
            <Badge variant="secondary" className="absolute left-2 top-2">
              {name}
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-1 p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
          {product.nameBn ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{product.nameBn}</p>
          ) : null}
          <p className="text-base font-semibold text-primary">
            {formatPriceRange(product.minPrice, product.maxPrice, locale)}
          </p>
          <StarRating value={product.ratingAvg} count={product.ratingCount ?? 0} />
        </div>
      </Link>
    </Card>
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
