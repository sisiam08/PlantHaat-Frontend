import { BadgeCheck, Banknote, Search, ShieldCheck } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlantImage } from "@/components/plant-image";
import { Price } from "@/components/product/price";
import {
  isSafeHeroHref,
  pickText,
  readHeroContent,
  type HeroImage,
} from "@/features/catalog/hero-content";
import { formatCount } from "@/lib/format/number";
import type { CategoryNode, ProductListItem } from "@/lib/api/types";
import cloudinaryLoader from "@/lib/images/cloudinary-loader";
import { getPublicSettings } from "@/server/public-settings";

const HERO_IMAGE_WIDTH = 1200;
const HERO_IMAGE_HEIGHT = 900;

function HeroPicture({ image, locale }: { image: HeroImage; locale: string }) {
  const alt = locale === "en" ? image.altEn || image.altBn : image.altBn || image.altEn;
  const common = { alt, sizes: "(min-width: 768px) 40vw, 100vw", loader: cloudinaryLoader };
  const desktop = getImageProps({
    ...common,
    src: image.url,
    width: HERO_IMAGE_WIDTH,
    height: HERO_IMAGE_HEIGHT,
  }).props;
  const mobileSrc = image.mobileUrl || image.url;
  const mobile = getImageProps({
    ...common,
    src: mobileSrc,
    width: 960,
    height: 600,
  }).props;
  const objectPosition = `${image.focalX}% ${image.focalY}%`;

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes={common.sizes} />
      <img
        {...mobile}
        alt={alt}
        fetchPriority="high"
        style={{ objectPosition }}
        className="size-full object-cover"
      />
    </picture>
  );
}

function HeroProductCard({
  product,
  locale,
  name,
  compact = false,
}: {
  product: ProductListItem;
  locale: string;
  name: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-card p-2.5 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span
        className={
          compact
            ? "relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted/40"
            : "relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted/40"
        }
      >
        <PlantImage
          src={product.image?.url}
          alt=""
          fill
          sizes="80px"
          loading="lazy"
          fetchPriority="low"
          className="object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="line-clamp-2 text-sm leading-snug font-medium">{name}</span>
        <Price value={product.minPrice} maxValue={product.maxPrice} locale={locale} size="sm" />
        {product.shop?.name ? (
          <span className="truncate text-xs text-muted-foreground">{product.shop.name}</span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * Marketplace-first hero: search is the primary action, chips link to real
 * filtered listings, one slim trust row, and the visual is either the admin's
 * uploaded image or real product cards. Server-rendered; the search form works
 * without JavaScript.
 */
export async function Hero({
  categories,
  products,
}: {
  categories: CategoryNode[];
  products: ProductListItem[];
}) {
  const t = await getTranslations("home");
  const ts = await getTranslations("search");
  const locale = await getLocale();
  const settings = await getPublicSettings();
  const hero = readHeroContent(settings);
  const windowHours = Number(settings["return.windowHours"] ?? 48);
  const productName = (product: ProductListItem) =>
    locale === "bn" && product.nameBn ? product.nameBn : product.name;
  const topCategories = categories.slice(0, 12);

  const trust = [
    { icon: BadgeCheck, label: t("trustVerified") },
    { icon: Banknote, label: t("trustCod") },
    { icon: ShieldCheck, label: t("trustComplaint", { hours: formatCount(windowHours, locale) }) },
  ];

  return (
    <section
      aria-labelledby="home-hero-title"
      data-home-hero
      className="border-b border-border/60 bg-[radial-gradient(120%_110%_at_88%_6%,var(--secondary)_0%,var(--background)_52%,color-mix(in_oklab,var(--secondary)_38%,white)_100%)]"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:items-center md:gap-8 md:py-8 lg:grid-cols-2 lg:py-10">
        <div className="grid gap-2.5 md:gap-4">
          <p className="inline-flex w-fit items-center gap-2 text-xs font-medium text-secondary-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("heroBadge")}
          </p>

          <h1
            id="home-hero-title"
            className="font-heading text-3xl leading-normal font-bold text-balance text-foreground sm:text-4xl"
          >
            {pickText(hero.headline, locale)}
          </h1>

          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {pickText(hero.subheadline, locale)}
          </p>

          {hero.image.url ? (
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/30 lg:hidden">
              <HeroPicture image={hero.image} locale={locale} />
            </div>
          ) : null}

          <form action="/products" method="get" role="search" className="grid grid-cols-5 gap-2 sm:flex sm:items-center">
            <label className="sr-only" htmlFor="hero-category">
              {t("shopByCategory")}
            </label>
            <select
              id="hero-category"
              name="category"
              defaultValue=""
              className="col-span-2 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:w-40 sm:px-3"
            >
              <option value="">{t("allCategories")}</option>
              {topCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {locale === "bn" && category.nameBn ? category.nameBn : category.name}
                </option>
              ))}
            </select>
            <div className="relative col-span-3 min-w-0 sm:col-auto sm:flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                name="q"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label={ts("label")}
                placeholder={ts("placeholder")}
                className="h-11 rounded-lg border-input bg-card pr-3 pl-10 text-base shadow-sm"
              />
            </div>
            <Button
              type="submit"
              variant="cta"
              size="lg"
              className="col-span-5 h-11 w-full px-5 sm:col-auto sm:w-auto"
            >
              {ts("label")}
            </Button>
          </form>

          {hero.chips.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {hero.chips.map((chip) => {
                if (!isSafeHeroHref(chip.href)) return null;
                return (
                  <Link
                    key={`${chip.href}-${chip.labelEn}`}
                    href={chip.href}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border bg-card/80 px-3.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    {locale === "en" ? chip.labelEn : chip.labelBn}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary-foreground">
            {trust.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>

          {!hero.image.url && products.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
              {products.slice(0, 3).map((product) => (
                <div key={product.id} className="w-52 shrink-0">
                  <HeroProductCard product={product} locale={locale} name={productName(product)} compact />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block">
          {hero.image.url ? (
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-[var(--shadow-soft)]">
              <HeroPicture image={hero.image} locale={locale} />
            </div>
          ) : products.length > 0 ? (
            <div className="grid gap-2.5">
              {products.slice(0, 2).map((product) => (
                <HeroProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  name={productName(product)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
