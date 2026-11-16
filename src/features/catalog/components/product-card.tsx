import { Heart, Star } from "lucide-react";
import Link from "next/link";

import { LinkPending } from "@/components/layout/link-pending";
import { PlantImage } from "@/components/plant-image";
import { cn } from "@/lib/utils";
import { Price } from "@/components/product/price";
import { formatPriceRange } from "@/lib/format/money";
import { RailScroller } from "@/features/catalog/components/rail-scroller";
import { PRODUCT_GRID_CLASS } from "@/features/catalog/components/product-grid";

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
  compareAtPrice?: string | null;
  inStock: boolean;
  lowStock?: boolean;
  verified?: boolean;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
  imageUrl?: string | null;
  secondImageUrl?: string | null;
  shopName?: string | null;
}

export interface CardRatingLabels {
  /** Visible + accessible text when the product has no reviews yet. */
  noReviews: string;
  /** ICU-style template with {rating} and {count} placeholders. */
  aria: string;
}

export function CardRating({
  value,
  count,
  labels,
}: {
  value: string | number | null | undefined;
  count: number;
  labels: CardRatingLabels;
}) {
  if (count <= 0) {
    return (
      <div
        data-card-rating
        data-card-rating-empty
        aria-label={labels.noReviews}
        className="flex min-h-5 items-center gap-1 text-xs text-muted-foreground"
      >
        <Star aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{labels.noReviews}</span>
      </div>
    );
  }
  const rating = Number(value ?? 0).toFixed(1);
  return (
    <div
      data-card-rating
      aria-label={labels.aria.replace("{rating}", rating).replace("{count}", String(count))}
      className="flex min-h-5 items-center gap-1 text-xs text-muted-foreground"
    >
      <Star aria-hidden className="size-3.5 shrink-0 fill-cta text-cta" />
      <span className="font-medium text-foreground">{rating}</span>
      <span>({count})</span>
    </div>
  );
}

export interface CardActionLabels {
  wishlistAdd: string;
}

export function ProductCard({
  product,
  name,
  locale,
  actionLabels,
  ratingLabels,
  variant = "compact",
}: {
  product: ProductCardData;
  name: string;
  locale: string;
  actionLabels: CardActionLabels;
  ratingLabels: CardRatingLabels;
  variant?: "compact" | "featured";
}) {
  const featured = variant === "featured";
  const reviews = product.ratingCount ?? 0;
  const priceLabel = formatPriceRange(product.minPrice, product.maxPrice, locale);

  return (
    <div
      className={cn(
        "group/card relative h-full overflow-hidden border border-border bg-card text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured ? "rounded-2xl" : "rounded-xl",
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        aria-label={priceLabel ? `${product.name} — ${priceLabel}` : product.name}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-4/5 overflow-hidden bg-[color-mix(in_oklab,var(--secondary)_28%,white)]">
          <LinkPending className="absolute top-2 right-2 z-10 text-primary" />
          <PlantImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="transition-transform duration-300 group-hover/card:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
          {!product.inStock ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/60">
              <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm">
                {name}
              </span>
            </div>
          ) : null}
        </div>

        <div className={cn("grid gap-1", featured ? "p-3.5" : "p-2.5")}>
          <p
            className={cn(
              "line-clamp-2 font-medium",
              featured ? "text-base leading-snug" : "text-sm leading-snug",
            )}
          >
            {product.name}
          </p>
          <Price
            value={product.minPrice}
            maxValue={product.maxPrice}
            compareAt={product.compareAtPrice}
            locale={locale}
            size={featured ? "md" : "sm"}
            className="text-primary"
          />
          <CardRating value={product.ratingAvg} count={reviews} labels={ratingLabels} />
        </div>
      </Link>

      <button
        type="button"
        data-card-wishlist
        data-product-id={product.id}
        data-slug={product.slug}
        data-saved="false"
        aria-label={actionLabels.wishlistAdd}
        aria-pressed={false}
        className="absolute top-1.5 right-1.5 z-20 grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Heart aria-hidden className="size-5" />
      </button>
    </div>
  );
}
export function ProductRailSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="relative w-full min-w-0">
      <div className="flex gap-2.5 overflow-hidden md:gap-3" aria-hidden>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="w-36 shrink-0 sm:w-40 md:w-44">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      data-product-skeleton
      className={cn(
        "overflow-hidden border border-border bg-card",
        featured ? "rounded-2xl" : "rounded-xl",
      )}
    >
      <div className="skeleton-shimmer aspect-4/5 w-full bg-muted" />
      <div className={cn("grid gap-1", featured ? "p-3.5" : "p-2.5")}>
        <div className="skeleton-shimmer h-3.5 w-4/5 rounded-full bg-muted" />
        <div className="skeleton-shimmer h-3.5 w-3/5 rounded-full bg-muted" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded-full bg-muted" />
        <div className="skeleton-shimmer h-3 w-2/3 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  locale,
  outOfStockLabel,
  actionLabels,
  ratingLabels,
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
  actionLabels: CardActionLabels;
  ratingLabels: CardRatingLabels;
}) {
  return (
    <div data-product-grid className={PRODUCT_GRID_CLASS}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          name={outOfStockLabel}
          locale={locale}
          actionLabels={actionLabels}
          ratingLabels={ratingLabels}
        />
      ))}
    </div>
  );
}

export function ProductRail({
  products,
  locale,
  outOfStockLabel,
  actionLabels,
  ratingLabels,
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
  actionLabels: CardActionLabels;
  ratingLabels: CardRatingLabels;
}) {
  return (
    <RailScroller label={outOfStockLabel}>
      {products.map((product) => (
        <div key={product.id} className="w-36 shrink-0 snap-start sm:w-40 md:w-44">
          <ProductCard
            product={product}
            name={outOfStockLabel}
            locale={locale}
            actionLabels={actionLabels}
            ratingLabels={ratingLabels}
          />
        </div>
      ))}
    </RailScroller>
  );
}
