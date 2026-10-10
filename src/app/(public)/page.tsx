import { ArrowRight, PackageCheck, Search, ShieldCheck, ShoppingCart, Store, Truck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductRail, type ProductCardData } from "@/features/catalog/components/product-card";
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
  const th = await getTranslations("home");
  const home = await getHome();
  const banners = home.banners as unknown as Banner[];
  const sections = home.sections as unknown as Section[];
  const hero = banners[0];

  const trust = [
    { icon: ShieldCheck, label: th("trustVerified") },
    { icon: Truck, label: th("trustCod") },
    { icon: PackageCheck, label: th("trustPackaging") },
  ];

  const steps = [
    { icon: Search, title: th("how1Title"), body: th("how1Body") },
    { icon: ShoppingCart, title: th("how2Title"), body: th("how2Body") },
    { icon: Truck, title: th("how3Title"), body: th("how3Body") },
  ];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-8 md:gap-20 md:py-12">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        {hero?.imageUrl ? (
          <Image
            src={hero.imageUrl}
            alt={hero.title ?? "PlantHaat"}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-10 object-cover opacity-25"
          />
        ) : null}
        <div className="grid max-w-2xl gap-6 px-6 py-12 md:px-12 md:py-20">
          <Badge variant="secondary" className="w-fit px-3 py-1">
            {th("heroBadge")}
          </Badge>
          <h1 className="font-heading text-4xl leading-[1.15] font-bold md:text-6xl">
            {th("heroTitle")}
          </h1>
          <p className="max-w-lg text-base text-primary-foreground/85 md:text-lg">
            {th("heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="cta" size="lg">
              <Link href="/products">
                {th("heroCta")} <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/shops">{th("heroCtaSecondary")}</Link>
            </Button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/85">
            {trust.map((item) => (
              <li key={item.label} className="inline-flex items-center gap-2">
                <item.icon aria-hidden className="size-4" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {sections.map((section) => {
        if (section.type === "FEATURED_CATEGORIES") {
          return (
            <section key={section.key} className="grid gap-5">
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-heading text-2xl font-semibold">
                  {sectionTitle(section, locale)}
                </h2>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {th("browseAll")} <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products?category=${item.slug ?? ""}`}
                    className="group/tile grid place-items-center gap-2 rounded-2xl border border-border/60 bg-secondary/50 px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="line-clamp-2 text-sm font-medium">
                      {locale === "bn" && item.nameBn ? item.nameBn : item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }
        if (section.type === "FEATURED_SHOPS") {
          return (
            <section key={section.key} className="grid gap-5">
              <h2 className="font-heading text-2xl font-semibold">
                {sectionTitle(section, locale)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <ShopCard
                    key={item.id}
                    shop={{
                      id: item.id,
                      name: item.name ?? "",
                      slug: item.slug ?? "",
                      logoUrl: item.logoUrl ?? null,
                      district: item.district ?? null,
                      ratingAvg: item.ratingAvg ?? "0",
                    }}
                  />
                ))}
              </div>
            </section>
          );
        }
        if (section.type === "FEATURED_PRODUCTS" || section.type === "NEW_ARRIVALS") {
          return (
            <section key={section.key} className="grid gap-5">
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-heading text-2xl font-semibold">
                  {sectionTitle(section, locale)}
                </h2>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {th("browseAll")} <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
              <ProductRail
                products={section.items.map(toCard)}
                locale={locale}
                outOfStockLabel={tp("outOfStock")}
              />
            </section>
          );
        }
        return null;
      })}

      <section className="grid gap-8 rounded-3xl border border-border/60 bg-secondary/40 px-6 py-12 md:grid-cols-3 md:px-12">
        <h2 className="font-heading col-span-full text-2xl font-semibold md:text-3xl">
          {th("howItWorks")}
        </h2>
        {steps.map((step, index) => (
          <div key={step.title} className="grid gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <step.icon aria-hidden className="size-5" />
            </span>
            <p className="font-heading text-lg font-semibold">
              {index + 1}. {step.title}
            </p>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-cta/25 to-secondary/50 px-6 py-10 md:flex-row md:items-center md:px-12">
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">
            {th("sellerCtaTitle")}
          </h2>
          <p className="max-w-xl text-muted-foreground">{th("sellerCtaBody")}</p>
        </div>
        <Button asChild variant="cta" size="lg">
          <Link href="/register/seller">
            <Store aria-hidden className="size-4" /> {th("sellerCtaButton")}
          </Link>
        </Button>
      </section>

      {sections.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-muted-foreground">{t("subtitle")}</p>
          <Button asChild variant="cta">
            <Link href="/products">{t("title")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
