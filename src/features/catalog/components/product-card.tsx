import { Heart, Plus, Star } from "lucide-react";
import Link from "next/link";

import { LinkPending } from "@/components/layout/link-pending";
import { PlantImage } from "@/components/plant-image";
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

function CompactRating({ value, count }: { value: string | number | null | undefined; count: number }) {
  const numeric = Number(value ?? 0);
  return (
    <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
      <Star aria-hidden className="size-3 fill-cta text-cta" />
      <span className="font-medium text-foreground">{numeric.toFixed(1)}</span>
      <span aria-hidden>Â·</span>
      <span>{count}</span>
      <span className="sr-only">{numeric.toFixed(1)} / 5</span>
    </span>
  );
}

export interface CardActionLabels {
  wishlistAdd: string;
  quickAdd: string;
}

export function ProductCard({
  product,
  name,
  locale,
  actionLabels,
  variant = "compact",
}: {
  product: ProductCardData;
  name: string;
  locale: string;
  actionLabels: CardActionLabels;
  variant?: "compact" | "featured";
}) {
  const featured = variant === "featured";
  const reviews = product.ratingCount ?? 0;

  return (
    <div
      className={cn(
        "group/card relative h-full overflow-hidden border border-border bg-card text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured ? "rounded-2xl" : "rounded-xl",
      )}
    >
      <div className="relative aspect-4/5 overflow-hidden bg-[color-mix(in_oklab,var(--secondary)_28%,white)]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={product.name}
          className="absolute inset-0 block"
        >
          <LinkPending className="absolute top-2 right-2 z-10 text-primary" />
          <PlantImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="transition-transform duration-300 group-hover/card:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
        </Link>

        <button
          type="button"
          data-card-wishlist
          data-product-id={product.id}
          data-slug={product.slug}
          aria-label={actionLabels.wishlistAdd}
          aria-pressed={false}
          className="absolute top-1.5 right-1.5 z-20 grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Heart aria-hidden className="size-5" />
        </button>

        <div className="absolute right-1.5 bottom-1.5 z-20">
          <button
            type="button"
            data-card-quickadd
            data-slug={product.slug}
            data-name={product.name}
            data-image={product.imageUrl ?? ""}
            data-shop={product.shopName ?? ""}
            aria-label={actionLabels.quickAdd}
            className="grid size-11 place-items-center rounded-full bg-cta text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover focus-visible:ring-3 focus-visible:ring-cta/40 focus-visible:outline-none"
          >
            <Plus aria-hidden />
          </button>
        </div>

        {!product.inStock ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/60">
            <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm">
              {name}
            </span>
          </div>
        ) : null}
      </div>

      <div className={cn("grid gap-1", featured ? "p-3.5" : "p-2.5")}>
        <Link
          href={`/products/${product.slug}`}
          className={cn(
            "line-clamp-2 font-medium hover:underline",
            featured ? "text-base leading-snug" : "text-[0.8125rem] leading-snug",
          )}
        >
          {product.name}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span
            className={cn(
              "font-heading font-semibold text-primary",
              featured ? "text-lg" : "text-[0.95rem]",
            )}
          >
            {formatPriceRange(product.minPrice, product.maxPrice, locale)}
          </span>
        </div>
        {reviews > 0 ? <CompactRating value={product.ratingAvg} count={reviews} /> : null}
        {product.shopName ? (
          <p className="line-clamp-1 text-[0.7rem] text-muted-foreground">{product.shopName}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProductCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden border border-border bg-card",
        featured ? "rounded-2xl" : "rounded-xl",
      )}
    >
      <div className="skeleton-shimmer aspect-4/5 w-full bg-muted" />
      <div className={cn("grid gap-1.5", featured ? "p-3.5" : "p-2.5")}>
        <div className="skeleton-shimmer h-3.5 w-4/5 rounded-full bg-muted" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  locale,
  outOfStockLabel,
  actionLabels,
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
  actionLabels: CardActionLabels;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          name={outOfStockLabel}
          locale={locale}
          actionLabels={actionLabels}
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
}: {
  products: ProductCardData[];
  locale: string;
  outOfStockLabel: string;
  actionLabels: CardActionLabels;
}) {
  return (
    <div className="-mx-4 flex min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
      {products.map((product) => (
        <div key={product.id} className="w-36 shrink-0 snap-start sm:w-40 md:w-auto">
          <ProductCard
            product={product}
            name={outOfStockLabel}
            locale={locale}
            actionLabels={actionLabels}
          />
        </div>
      ))}
    </div>
  );
}


