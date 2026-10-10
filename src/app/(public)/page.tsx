import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductGrid, type ProductCardData } from "@/features/catalog/components/product-card";
import { ShopCard } from "@/features/catalog/components/shop-card";
import { getHome } from "@/features/catalog/server";

interface Banner {
  id?: string;
  imageUrl: string;
  title?: string | null;
  linkUrl?: string | null;
}

interface SectionItem {
  id: string;
  name?: string;
  nameBn?: string | null;
  slug?: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  inStock?: boolean;
  ratingAvg?: string | number | null;
  ratingCount?: number | null;
  district?: string | null;
  images?: { url: string; altText?: string | null }[];
  shop?: { name?: string } | null;
}

interface Section {
  key: string;
  title: string;
  titleBn?: string | null;
  type: string;
  items: SectionItem[];
}

function sectionTitle(section: Section, locale: string): string {
  return locale === "bn" && section.titleBn ? section.titleBn : section.title;
}

function toCard(item: SectionItem): ProductCardData {
  return {
    id: item.id,
    name: item.name ?? "",
    nameBn: item.nameBn ?? null,
    slug: item.slug ?? "",
    minPrice: item.minPrice ?? null,
    maxPrice: item.maxPrice ?? null,
    inStock: Boolean(item.inStock),
    ratingAvg: item.ratingAvg ?? "0",
    ratingCount: item.ratingCount ?? 0,
    imageUrl: item.images?.[0]?.url ?? null,
    shopName: item.shop?.name ?? null,
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("catalog");
  const tp = await getTranslations("product");
  const home = await getHome();
  const banners = home.banners as unknown as Banner[];
  const sections = home.sections as unknown as Section[];
  const hero = banners[0];

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-6">
      <section className="overflow-hidden rounded-2xl">
        {hero ? (
          <Link
            href={hero.linkUrl ?? "/products"}
            className="relative block h-56 w-full md:h-80"
          >
            <Image
              src={hero.imageUrl}
              alt={hero.title ?? "PlantHaat"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {hero.title ? (
              <span className="absolute bottom-4 left-4 rounded-full bg-ink/80 px-4 py-1.5 text-sm font-medium text-cream">
                {hero.title}
              </span>
            ) : null}
          </Link>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-3 bg-gradient-to-b from-secondary to-primary/90 px-6 text-center md:h-72">
            <h1 className="text-3xl font-bold text-white md:text-4xl">PlantHaat</h1>
            <p className="text-cream">{t("subtitle")}</p>
            <Button asChild variant="cta" size="lg">
              <Link href="/products">{t("title")}</Link>
            </Button>
          </div>
        )}
      </section>

      {sections.map((section) => {
        if (section.type === "FEATURED_CATEGORIES") {
          return (
            <section key={section.key} className="grid gap-4">
              <h2 className="text-xl font-semibold">{sectionTitle(section, locale)}</h2>
              <div className="flex flex-wrap gap-2">
                {section.items.map((item) => (
                  <Link key={item.id} href={`/products?category=${item.slug ?? ""}`}>
                    <Badge variant="secondary" className="px-4 py-2 text-sm">
                      {locale === "bn" && item.nameBn ? item.nameBn : item.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </section>
          );
        }
        if (section.type === "FEATURED_SHOPS") {
          return (
            <section key={section.key} className="grid gap-4">
              <h2 className="text-xl font-semibold">{sectionTitle(section, locale)}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <ShopCard
                    key={item.id}
                    shop={{ id: item.id, name: item.name ?? "", slug: item.slug ?? "", logoUrl: item.logoUrl ?? null, district: item.district ?? null, ratingAvg: item.ratingAvg ?? "0" }}
                  />
                ))}
              </div>
            </section>
          );
        }
        if (section.type === "FEATURED_PRODUCTS" || section.type === "NEW_ARRIVALS") {
          return (
            <section key={section.key} className="grid gap-4">
              <h2 className="text-xl font-semibold">{sectionTitle(section, locale)}</h2>
              <ProductGrid
                products={section.items.map(toCard)}
                locale={locale}
                outOfStockLabel={tp("outOfStock")}
              />
            </section>
          );
        }
        return null;
      })}

      {sections.length === 0 ? (
        <Card className="grid place-items-center gap-3 rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">{t("subtitle")}</p>
          <Button asChild variant="cta">
            <Link href="/products">{t("title")}</Link>
          </Button>
        </Card>
      ) : null}
    </main>
  );
}
