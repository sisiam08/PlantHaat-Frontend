import { BadgeCheck, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryEstimator } from "@/features/catalog/components/delivery-estimator";
import { StarRating } from "@/features/catalog/components/product-card";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import {
  ProductInfoSections,
  type CareItem,
} from "@/features/catalog/components/product-info-sections";
import { RelatedProducts } from "@/features/catalog/components/related-products";
import { ProductEngagement } from "@/features/qa/components/product-engagement";
import { VariantPicker, type VariantView } from "@/features/catalog/components/variant-picker";
import { ProductViewBeacon } from "@/features/catalog/components/product-view-beacon";
import { getDistricts, getProduct } from "@/features/catalog/server";
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
  verified?: boolean;
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
    if (!product) {
      return { title: "Product" };
    }
    return {
      title: product.name,
      description: product.description.slice(0, 160),
    };
  } catch {
    return { title: "Product" };
  }
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="grid grid-cols-1 content-start gap-6">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
      <div className="mt-12 grid gap-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </main>
  );
}

async function ProductContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product: ProductDetail | null = await getProduct(slug);
  if (!product) {
    // Only a real backend 404 is "not found"; a network/gateway failure from
    // `getProduct` throws and reaches error.tsx where the user can retry.
    notFound();
  }

  const locale = await getLocale();
  const t = await getTranslations("product");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("catalog");
  const [images, districts] = [
    product.images as unknown as DetailImage[],
    await getDistricts(),
  ];
  const variants = product.variants as unknown as VariantView[];
  const shop = product.shop as unknown as DetailShop;

  const careLabel = (value: string | null | undefined): string =>
    value ? t(`care.${value}`) : "—";

  const careItems: CareItem[] = [
    { key: "light", label: t("light"), value: careLabel(product.lightRequirement) },
    { key: "watering", label: t("watering"), value: careLabel(product.wateringFrequency) },
    { key: "difficulty", label: t("difficulty"), value: careLabel(product.careDifficulty) },
    { key: "indoor", label: t("indoor"), value: product.isIndoor ? "✓" : "—" },
    { key: "petSafe", label: t("petSafe"), value: product.isPetSafe ? "✓" : "—" },
    {
      key: "height",
      label: t("height"),
      value: product.matureHeightCm ? `${product.matureHeightCm} cm` : "—",
    },
  ];

  const deliveryPanel = (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4">
        <BadgeCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="grid gap-0.5 text-sm">
          <p className="font-medium">
            {t("dispatchFrom", { district: shop.district ?? "—" })}
          </p>
          <p className="text-muted-foreground">{shop.name}</p>
        </div>
      </div>
      <DeliveryEstimator shopSlug={shop.slug} districts={districts} />
    </div>
  );

  const returnsPanel = (
    <div className="grid gap-2 text-sm">
      <h3 className="font-medium">{t("returnsTitle")}</h3>
      <p className="text-muted-foreground">{t("returnsBody")}</p>
      <Link href="/policies/refund-cancellation" className="font-medium text-primary hover:underline">
        {t("policyLink")}
      </Link>
    </div>
  );

  const sellerCard = (
    <div className="flex items-center gap-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/40">
        {shop.logoUrl ? (
          <Image src={shop.logoUrl} alt={shop.name} fill sizes="48px" className="object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium">
          {shop.name}
          {shop.verified ? <BadgeCheck aria-hidden className="size-4 text-primary" /> : null}
        </p>
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
  );

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
    <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-[calc(var(--flowbar-h)+1.5rem+env(safe-area-inset-bottom))] md:pb-12 lg:pt-12">
      <Breadcrumb className="mb-5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">{tn("home")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/products">{tc("title")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} alt={product.name} label={t("gallery")} />

        <div className="grid grid-cols-1 content-start gap-6">
          <div className="grid gap-2">
            <h1 className="font-heading text-3xl font-bold">{product.name}</h1>
            {product.nameBn ? (
              <p className="text-muted-foreground">{product.nameBn}</p>
            ) : null}
            {product.scientificName ? (
              <p className="text-sm text-muted-foreground">{product.scientificName}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {product.ratingCount > 0 ? (
                <StarRating value={product.ratingAvg} count={product.ratingCount} />
              ) : null}
              <Badge variant={product.inStock ? "secondary" : "destructive"}>
                {product.inStock ? t("available") : t("outOfStock")}
              </Badge>
            </div>
          </div>

          <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <VariantPicker
              variants={variants}
              product={{
                productId: product.id,
                productName: product.name,
                slug: product.slug,
                imageUrl: images[0]?.url ?? null,
                shopName: shop.name,
              }}
            />
          </div>

          {shop.isOnVacation ? (
            <Badge variant="secondary" className="w-fit">
              {t("shopOnVacation")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-12">
        <ProductInfoSections
          description={product.description}
          careItems={careItems}
          instructions={product.careInstructions}
          delivery={deliveryPanel}
          returns={returnsPanel}
          seller={sellerCard}
        />
      </div>

      <div className="mt-12">
        <ProductEngagement
          slug={slug}
          productId={product.id}
          reviewCount={product.ratingCount}
          questionCount={0}
        />
      </div>

      <div className="mt-14">
        <Suspense
          fallback={
            <div className="grid gap-4">
              <Skeleton className="h-7 w-56" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
                ))}
              </div>
            </div>
          }
        >
          <RelatedProducts slug={slug} excludeId={product.id} />
        </Suspense>
      </div>

      <ProductViewBeacon productId={product.id} />

      <script
        type="application/ld+json"
        // JSON-LD is serialized safely (escapes `<`).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <span className="sr-only">{formatBdt(product.minPrice, locale)}</span>
    </main>
  );
}

