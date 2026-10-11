import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/features/catalog/components/product-card";
import {
  VariantPicker,
  type VariantView,
} from "@/features/catalog/components/variant-picker";
import type { ProductDetail } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";

interface QuickViewImage {
  url: string;
  altText?: string | null;
}

interface QuickViewShop {
  name: string;
  slug: string;
  logoUrl?: string | null;
  district?: string | null;
}

export async function ProductQuickView({ product }: { product: ProductDetail }) {
  const locale = await getLocale();
  const t = await getTranslations("product");
  const images = product.images as unknown as QuickViewImage[];
  const variants = product.variants as unknown as (VariantView & {
    sizeLabel?: string | null;
  })[];
  const shop = product.shop as unknown as QuickViewShop | undefined;
  const primary = images[0];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/40 ring-1 ring-border/40">
        {primary ? (
          <Image
            src={primary.url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 90vw, 40vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="grid content-start gap-3">
        <div className="grid gap-1">
          <DialogTitle className="font-heading text-xl font-bold">{product.name}</DialogTitle>
          {product.nameBn ? (
            <p className="text-sm text-muted-foreground">{product.nameBn}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StarRating value={product.ratingAvg} count={product.ratingCount} />
          <span className="font-heading text-lg font-semibold text-primary">
            {formatBdt(product.minPrice, locale)}
          </span>
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {shop ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-lg bg-muted/40 ring-1 ring-border/40">
              {shop.logoUrl ? (
                <Image
                  src={shop.logoUrl}
                  alt={shop.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <Link href={`/shops/${shop.slug}`} className="font-medium hover:underline">
              {shop.name}
            </Link>
            {shop.district ? (
              <span className="text-muted-foreground">· {shop.district}</span>
            ) : null}
          </div>
        ) : null}

        <VariantPicker
          variants={variants}
          product={{
            productId: product.id,
            productName: product.name,
            slug: product.slug,
            imageUrl: primary?.url ?? null,
            shopName: shop?.name ?? null,
          }}
          embedded
        />

        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("viewFullDetails")}
        </Link>
      </div>
    </div>
  );
}
