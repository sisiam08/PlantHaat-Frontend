import {
  Droplets,
  Gauge,
  Home,
  PawPrint,
  Ruler,
  Star,
  Sun,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/features/catalog/components/product-card";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { VariantPicker, type VariantView } from "@/features/catalog/components/variant-picker";
import { getProduct } from "@/features/catalog/server";
import { ReviewsList } from "@/features/reviews/components/reviews-list";
import type { ProductDetail } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";

interface DetailImage {
  url: string;
  altText?: string | null;
}

interface DetailShop {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  district?: string | null;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
  isOnVacation?: boolean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: product.name,
      description: product.description.slice(0, 160),
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: ProductDetail;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  const locale = await getLocale();
  const t = await getTranslations("product");
  const images = product.images as unknown as DetailImage[];
  const variants = product.variants as unknown as (VariantView & { sizeLabel?: string | null })[];
  const shop = product.shop as unknown as DetailShop;

  const careLabel = (value: string | null | undefined): string =>
    value ? t(`care.${value}`) : "—";

  const careItems = [
    { icon: Sun, label: t("light"), value: careLabel(product.lightRequirement) },
    { icon: Droplets, label: t("watering"), value: careLabel(product.wateringFrequency) },
    { icon: Gauge, label: t("difficulty"), value: careLabel(product.careDifficulty) },
    { icon: Home, label: t("indoor"), value: product.isIndoor ? "✓" : "—" },
    { icon: PawPrint, label: t("petSafe"), value: product.isPetSafe ? "✓" : "—" },
    {
      icon: Ruler,
      label: t("height"),
      value: product.matureHeightCm ? `${product.matureHeightCm} cm` : "—",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images.map((image) => image.url),
    description: product.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: product.minPrice ?? undefined,
      highPrice: product.maxPrice ?? undefined,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      product.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          }
        : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} alt={product.name} label={t("gallery")} />

        <div className="grid content-start gap-6">
          <div className="grid gap-2">
            <h1 className="font-heading text-3xl leading-tight font-bold">{product.name}</h1>
            {product.nameBn ? (
              <p className="text-muted-foreground">{product.nameBn}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={product.ratingAvg} count={product.ratingCount} />
              <Badge variant={product.inStock ? "secondary" : "destructive"}>
                {product.inStock ? t("inStock", { count: 1 }) : t("outOfStock")}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:sticky lg:top-24">
            <VariantPicker
              variants={variants}
              product={{
                productName: product.name,
                slug: product.slug,
                imageUrl: images[0]?.url ?? null,
                shopName: shop.name,
              }}
            />

            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4">
              <Truck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="grid gap-0.5">
                <p className="text-sm font-medium">{t("deliveryTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("deliveryBody")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/40">
              {shop.logoUrl ? (
                <Image
                  src={shop.logoUrl}
                  alt={shop.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{shop.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star aria-hidden className="size-3 fill-cta text-cta" />
                {Number(shop.ratingAvg ?? 0).toFixed(1)}
                {shop.district ? ` · ${shop.district}` : ""}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/shops/${shop.slug}`}>{t("viewShop")}</Link>
            </Button>
          </div>

          {shop.isOnVacation ? (
            <Badge variant="secondary" className="w-fit">
              {t("outOfStock")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section className="grid content-start gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("description")}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {product.description}
          </p>
        </section>

        <section className="grid content-start gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("careTitle")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {careItems.map((item) => (
              <div
                key={item.label}
                className="grid gap-1 rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
              >
                <item.icon aria-hidden className="size-4 text-primary" />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-12">
        <ReviewsList slug={slug} />
      </section>

      <script
        type="application/ld+json"
        // JSON-LD is serialized safely (escapes `<`).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <span className="sr-only">{formatBdt(product.minPrice, locale)}</span>
    </main>
  );
}
