"use client";

import Autoplay from "embla-carousel-autoplay";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HOME_BANNERS, type HomeBanner } from "@/config/home-banners";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "cn";

function BannerPicture({ banner, priority }: { banner: HomeBanner; priority: boolean }) {
  const locale = useLocale();
  const alt = locale === "en" ? banner.alt.en : banner.alt.bn;
  const common = { alt, sizes: "100vw" };
  const { props: desktop } = getImageProps({
    ...common,
    src: banner.image.desktop,
    width: 1920,
    height: 640,
  });
  const { props: mobile } = getImageProps({
    ...common,
    src: banner.image.mobile,
    width: 900,
    height: 1000,
  });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
      <img
        {...mobile}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  );
}

function BannerSlide({ banner, priority }: { banner: HomeBanner; priority: boolean }) {
  const locale = useLocale();
  const pick = (value?: { bn: string; en: string }) =>
    value ? (locale === "en" ? value.en : value.bn) : undefined;

  return (
    <div className="relative aspect-[9/10] w-full overflow-hidden sm:aspect-[16/10] md:aspect-[3/1]">
      <BannerPicture banner={banner} priority={priority} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent md:bg-gradient-to-r md:from-ink/70 md:via-ink/20 md:to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end gap-4 p-6 md:justify-center md:p-14">
        {banner.headline ? (
          <h2 className="font-heading max-w-xl text-2xl leading-tight font-bold text-cream drop-shadow-sm md:text-4xl lg:text-5xl">
            {pick(banner.headline)}
          </h2>
        ) : null}
        {banner.cta ? (
          <Link
            href={banner.href}
            className="inline-flex w-fit items-center rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-cta/40 focus-visible:outline-none motion-reduce:hover:translate-y-0"
          >
            {pick(banner.cta)}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function BannerCarousel() {
  const t = useTranslations("home");
  const reduced = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [autoplay] = useState(() =>
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true, align: "start" }}
      plugins={reduced ? [] : [autoplay]}
      aria-label={t("bannerLabel")}
      className="overflow-hidden rounded-3xl border border-border/60"
    >
      <CarouselContent className="ml-0">
        {HOME_BANNERS.map((banner, index) => (
          <CarouselItem key={banner.id} className="pl-0">
            <BannerSlide banner={banner} priority={index === 0} />
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselPrevious className="left-3 hidden md:inline-flex" />
      <CarouselNext className="right-3 hidden md:inline-flex" />

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {HOME_BANNERS.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            aria-label={t("slideLabel", { index: index + 1, total: HOME_BANNERS.length })}
            aria-current={index === selected}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "size-2.5 rounded-full transition-colors",
              index === selected ? "bg-cta" : "bg-cream/60 hover:bg-cream",
            )}
          />
        ))}
      </div>
    </Carousel>
  );
}
