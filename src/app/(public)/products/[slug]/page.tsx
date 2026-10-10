import { Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/features/catalog/components/product-card";
import { VariantPicker, type VariantView } from "@/features/catalog/components/variant-picker";
import { getProduct } from "@/features/catalog/server";
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

function humanize(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 lg:grid-cols-2">
      <div className="grid gap-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/40">
          {images[0] ? (
            <Image
              src={images[0].url}
              alt={images[0].altText ?? product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(0, 4).map((image) => (
              <div
                key={image.url}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted/40"
              >
                <Image src={image.url} alt={image.altText ?? product.name} fill sizes="25vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid content-start gap-5">
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.nameBn ? <p className="text-muted-foreground">{product.nameBn}</p> : null}
          <StarRating value={product.ratingAvg} count={product.ratingCount} />
        </div>

        <VariantPicker
          variants={variants}
          product={{
            productName: product.name,
            slug: product.slug,
            imageUrl: images[0]?.url ?? null,
            shopName: shop.name,
          }}
        />

        <Separator />

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("shop")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted/40">
              {shop.logoUrl ? (
                <Image src={shop.logoUrl} alt={shop.name} fill sizes="48px" className="object-cover" />
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
          </CardContent>
        </Card>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">{t("description")}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {product.description}
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">{t("care")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("light")}</dt>
            <dd>{humanize(product.lightRequirement)}</dd>
            <dt className="text-muted-foreground">{t("watering")}</dt>
            <dd>{humanize(product.wateringFrequency)}</dd>
            <dt className="text-muted-foreground">{t("difficulty")}</dt>
            <dd>{humanize(product.careDifficulty)}</dd>
            <dt className="text-muted-foreground">{t("indoor")}</dt>
            <dd>{product.isIndoor ? "✓" : "—"}</dd>
            <dt className="text-muted-foreground">{t("petSafe")}</dt>
            <dd>{product.isPetSafe ? "✓" : "—"}</dd>
            <dt className="text-muted-foreground">{t("height")}</dt>
            <dd>{product.matureHeightCm ? `${product.matureHeightCm} cm` : "—"}</dd>
          </dl>
        </section>

        {shop.isOnVacation ? (
          <Badge variant="secondary" className="w-fit">
            On vacation
          </Badge>
        ) : null}
      </div>

      <script
        type="application/ld+json"
        // JSON-LD is serialized safely (escapes `<`).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <span className="sr-only">{formatBdt(product.minPrice, locale)}</span>
    </main>
  );
}
