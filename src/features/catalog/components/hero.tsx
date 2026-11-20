import { ArrowRight, Search } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroScene } from "@/features/catalog/components/hero-scene";
import { pickText, readHeroContent, type HeroImage } from "@/features/catalog/hero-content";
import cloudinaryLoader from "@/lib/images/cloudinary-loader";
import { getPublicSettings } from "@/server/public-settings";

function AdminHeroImage({ image, locale }: { image: HeroImage; locale: string }) {
  const alt = locale === "en" ? image.altEn || image.altBn : image.altBn || image.altEn;
  const common = { alt, sizes: "(min-width: 1024px) 44vw, 92vw", loader: cloudinaryLoader };
  const desktop = getImageProps({
    ...common,
    src: image.url,
    width: 1200,
    height: 900,
  }).props;
  const mobile = getImageProps({
    ...common,
    src: image.mobileUrl || image.url,
    width: 960,
    height: 720,
  }).props;
  return (
    <div className="relative mx-auto aspect-3/2 w-full max-w-[560px] overflow-hidden lg:aspect-11/10 lg:max-w-none">
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktop.srcSet} sizes={common.sizes} />
        <img
          {...mobile}
          alt={alt}
          fetchPriority="high"
          style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
          className="size-full object-cover"
        />
      </picture>
    </div>
  );
}

/**
 * The owner-preferred editorial hero left side, with a borderless real-plant
 * scene on the right. The scene is server-rendered and enhanced by a small
 * WebGL island only when motion/WebGL/save-data allow it.
 */
export async function Hero() {
  const t = await getTranslations("home");
  const ts = await getTranslations("search");
  const locale = await getLocale();
  const settings = await getPublicSettings();
  const hero = readHeroContent(settings);

  return (
    <section
      aria-labelledby="home-hero-title"
      data-home-hero
      className="hero-grain relative overflow-hidden border-y border-border/60 bg-[radial-gradient(120%_120%_at_85%_10%,var(--secondary)_0%,var(--background)_46%,color-mix(in_oklab,var(--secondary)_55%,white)_100%)]"
    >
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-end gap-8 px-4 py-10 md:gap-10 md:py-14 lg:min-h-[600px] lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="grid gap-5 lg:self-center lg:pb-8">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("heroBadge")}
          </p>

          <h1
            id="home-hero-title"
            className="font-heading text-4xl font-bold text-balance text-foreground sm:text-5xl lg:text-6xl"
          >
            {pickText(hero.headline, locale)}
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {pickText(hero.subheadline, locale)}
          </p>

          <form
            action="/products"
            method="get"
            role="search"
            className="flex w-full max-w-xl flex-col gap-2 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                name="q"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label={ts("label")}
                placeholder={ts("placeholder")}
                className="h-12 rounded-full border-input bg-card pl-11 text-base shadow-sm"
              />
            </div>
            <Button type="submit" variant="cta" size="lg" className="h-12 w-full px-6 lg:w-auto">
              {ts("label")}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link
              href="/shops"
              className="inline-flex min-h-11 items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("heroCtaSecondary")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("heroCta")}
            </Link>
          </div>
        </div>

        <div className="relative mb-14 w-full lg:mb-0 lg:self-end">
          {hero.image.url ? (
            <AdminHeroImage image={hero.image} locale={locale} />
          ) : (
            <HeroScene />
          )}
        </div>
      </div>
    </section>
  );
}
