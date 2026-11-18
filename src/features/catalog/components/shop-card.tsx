import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";



export interface ShopCardData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  district?: string | null;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
  productCount?: number | null;
}

export function ShopCard({ shop }: { shop: ShopCardData }) {
  return (
    <div
      data-card-focus
      className="group/card overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Link
        href={`/shops/${shop.slug}`}
        className="flex items-center gap-4 p-4 focus-visible:outline-none"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/40">
          {shop.logoUrl ? (
            <Image
              src={shop.logoUrl}
              alt={shop.name}
              fill
              sizes="64px"
              className="object-cover transition-transform duration-300 group-hover/card:scale-105 motion-reduce:transition-none"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{shop.name}</p>
          {shop.district ? (
            <p className="text-xs text-muted-foreground">{shop.district}</p>
          ) : null}
          <p className="mt-1 inline-flex items-center gap-1 text-sm">
            <Star aria-hidden className="size-3.5 fill-cta text-cta" />
            {Number(shop.ratingAvg ?? 0).toFixed(1)}
            {typeof shop.productCount === "number" ? (
              <span className="ml-2 text-xs text-muted-foreground">{shop.productCount}</span>
            ) : null}
          </p>
        </div>
      </Link>
    </div>
  );
}

